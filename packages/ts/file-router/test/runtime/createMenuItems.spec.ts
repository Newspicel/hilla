import './vaadinGlobals.js'; // eslint-disable-line import/no-unassigned-import
import chaiLike from 'chai-like';
import type { Writable } from 'type-fest';
import { expect, chai, describe, it } from 'vitest';
import { createMenuItems, viewsSignal } from '../../src/runtime/createMenuItems.js';
import type { MenuItem } from '../../src/types.js';

chai.use(chaiLike);

const collator = new Intl.Collator('en-US');

function cleanup(items: Array<Writable<MenuItem>>) {
  items
    .sort(({ to: a }, { to: b }) => collator.compare(a, b))
    .forEach((item) => {
      if (!item.title) {
        delete item.title;
      }

      if (!item.to) {
        delete item.icon;
      }
    });
}

describe('@vaadin/hilla-file-router', () => {
  describe('createMenuItems', () => {
    it('should generate a set of menu items', () => {
      viewsSignal.value = {
        '/about': { route: 'about', title: 'About' },
        '/profile/': { title: 'Profile' },
        '/profile/account/security/password': { title: 'Password' },
        '/profile/account/security/two-factor-auth': { title: 'Two Factor Auth' },
        '/profile/friends/list': { title: 'List' },
        '/test/empty': {},
        '/test/no-default-export': { title: 'No Default Export' },
      };
      const items = createMenuItems();
      cleanup(items as Array<Writable<MenuItem>>);

      const expected = [
        {
          title: 'About',
          to: '/about',
        },
        {
          title: 'Profile',
          to: '/profile/',
        },
        {
          title: 'Password',
          to: '/profile/account/security/password',
        },
        {
          title: 'Two Factor Auth',
          to: '/profile/account/security/two-factor-auth',
        },
        {
          title: 'List',
          to: '/profile/friends/list',
        },
        {
          to: '/test/empty',
        },
        {
          title: 'No Default Export',
          to: '/test/no-default-export',
        },
      ];
      cleanup(expected);

      expect(items).to.be.like(expected);
    });

    it('should sort menu items by order then by natural string comparison based on path', () => {
      viewsSignal.value = {
        '/a/b': { route: 'about', title: 'About' },
        '': { title: 'Profile' },
        '/profile/account/security/password': { title: 'Password', menu: { order: 20 } },
        '/profile/account/security/two-factor-auth': { title: 'Two Factor Auth', menu: { order: 20 } },
        '/b': { title: 'List' },
        '/': { title: 'Root' },
        '/test/empty': { title: 'empty', menu: { order: 5 } },
        '/test/no-default-export': { title: 'No Default Export', menu: { order: 10 } },
      };
      const items = createMenuItems();
      const cleanedUp = (items as Array<Writable<MenuItem>>).map((item) => ({
        to: item.to,
        title: item.title,
      }));

      const expected = [
        {
          title: 'empty',
          to: '/test/empty',
        },
        {
          title: 'No Default Export',
          to: '/test/no-default-export',
        },
        {
          title: 'Password',
          to: '/profile/account/security/password',
        },
        {
          title: 'Two Factor Auth',
          to: '/profile/account/security/two-factor-auth',
        },
        {
          title: 'Profile',
          to: '',
        },
        {
          title: 'Root',
          to: '/',
        },
        {
          title: 'About',
          to: '/a/b',
        },
        {
          title: 'List',
          to: '/b',
        },
      ];

      expect(cleanedUp).to.deep.equal(expected);
    });
  });
});
