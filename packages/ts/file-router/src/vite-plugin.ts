import { basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { TransformResult } from 'rollup';
import type { Logger, Plugin } from 'vite';
import { generateRuntimeFiles, type RuntimeFileUrls } from './vite-plugin/generateRuntimeFiles.js';

const INJECTION =
  "if (Object.keys(nextExports).length === 2 && 'default' in nextExports && 'config' in nextExports) {nextExports = { ...nextExports, config: currentExports.config };}";

/**
 * The options for the Vite file-based router plugin.
 */
export type PluginOptions = Readonly<{
  /**
   * The base directory for the router. The folders and files in this directory
   * will be used as route paths.
   *
   * @defaultValue `frontend/views`
   */
  viewsDir?: URL | string;
  /**
   * The directory where the generated view file will be stored.
   *
   * @defaultValue `frontend/generated`
   */
  generatedDir?: URL | string;
  /**
   * The list of extensions that will be collected as routes of the file-based
   * router.
   *
   * @defaultValue `['.tsx', '.jsx']`
   */
  extensions?: readonly string[];
  /**
   * The flag to indicate whether the plugin is running in development mode.
   *
   * @defaultValue `false`
   */
  isDevMode?: boolean;
  /**
   * The flag to indicate whether to output debug information
   *
   * @defaultValue `false`
   */
  debug?: boolean;
}>;

/**
 * A Vite plugin that generates a router from the files in the specific directory.
 *
 * @param options - The plugin options.
 * @returns A Vite plugin.
 */
export default function vitePluginFileSystemRouter({
  viewsDir = 'frontend/views/',
  generatedDir = 'frontend/generated/',
  extensions = ['.tsx', '.jsx'],
  isDevMode = false,
  debug = false,
}: PluginOptions = {}): Plugin {
  let _viewsDir: URL;
  let _outDir: URL;
  let _logger: Logger;
  let runtimeUrls: RuntimeFileUrls;

  return {
    name: 'vite-plugin-file-router',
    configResolved({ logger, root, build: { outDir } }) {
      const _root = pathToFileURL(root);
      const _generatedDir = new URL(generatedDir, _root);

      _viewsDir = new URL(viewsDir, _root);
      _outDir = pathToFileURL(outDir);
      _logger = logger;

      if (debug) {
        _logger.info(`The directory of route files: ${String(_viewsDir)}`);
        _logger.info(`The directory of generated files: ${String(_generatedDir)}`);
        _logger.info(`The output directory: ${String(_outDir)}`);
      }
      runtimeUrls = {
        json: new URL('file-routes.json', isDevMode ? _generatedDir : _outDir),
        code: new URL('file-routes.ts', _generatedDir),
        layouts: new URL('layouts.json', _generatedDir),
      };
    },
    async buildStart() {
      try {
        await generateRuntimeFiles(_viewsDir, runtimeUrls, extensions, _logger, debug);
      } catch (e: unknown) {
        _logger.error(String(e));
      }
    },
    configureServer(server) {
      const dir = fileURLToPath(_viewsDir);

      const changeListener = (file: string): void => {
        if (!file.startsWith(dir)) {
          if (file === fileURLToPath(runtimeUrls.json)) {
            server.hot.send({ type: 'custom', event: 'fs-route-update' });
          } else if (file !== fileURLToPath(runtimeUrls.layouts)) {
            // outside views folder, only changes to layouts file should trigger files generation
            return;
          }
        }

        generateRuntimeFiles(_viewsDir, runtimeUrls, extensions, _logger, debug).catch((e: unknown) =>
          _logger.error(String(e)),
        );
      };

      server.watcher.on('add', changeListener);
      server.watcher.on('change', changeListener);
      server.watcher.on('unlink', changeListener);
    },
    transform(code, id): Promise<TransformResult> | TransformResult {
      let modifiedCode = code;
      const viewsDirUsingSlashes = fileURLToPath(_viewsDir).replaceAll('\\', '/');
      if (id.startsWith(viewsDirUsingSlashes) && !basename(id).startsWith('_')) {
        if (isDevMode) {
          // To enable HMR for route files with exported configurations, we need
          // to address a limitation in `react-refresh`. This library requires
          // strict equality (`===`) for non-component exports. However, the
          // dynamic nature of HMR makes maintaining this equality between object
          // literals challenging.
          //
          // To work around this, we implement a strategy that preserves the
          // reference to the original configuration object (`currentExports.config`),
          // replacing any newly created configuration objects (`nextExports.config`)
          // with it. This ensures that the HMR mechanism perceives the
          // configuration as unchanged.
          const injectionPattern = /import\.meta\.hot\.accept[\s\S]+if\s\(!nextExports\)\s+return;/gu;
          if (injectionPattern.test(modifiedCode)) {
            modifiedCode = `${modifiedCode.substring(0, injectionPattern.lastIndex)}${INJECTION}${modifiedCode.substring(
              injectionPattern.lastIndex,
            )}`;
          }
        } else {
          // In production mode, the function name is assigned as name to the function itself to avoid minification
          const functionNames = /export\s+default\s+(?:function\s+)?(\w+)/u.exec(modifiedCode);

          if (functionNames?.length) {
            const [, functionName] = functionNames;
            modifiedCode += `Object.defineProperty(${functionName}, 'name', { value: '${functionName}' });\n`;
          }
        }

        return {
          code: modifiedCode,
        };
      }

      return undefined;
    },
  };
}
