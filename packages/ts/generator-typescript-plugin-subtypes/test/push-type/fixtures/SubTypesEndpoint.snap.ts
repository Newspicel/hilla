import { EndpointRequestInit as EndpointRequestInit_1 } from "@hilla/frontend";
import client_1 from "./connect-client.default.js";
import type BaseEventUnion_1 from "./dev/hilla/parser/plugins/subtypes/BaseEventUnion.js";
async function receiveEvent_1(event: BaseEventUnion_1 | undefined, init?: EndpointRequestInit_1): Promise<void> { return client_1.call("SubTypesEndpoint", "receiveEvent", { event }, init); }
async function sendEvent_1(init?: EndpointRequestInit_1): Promise<BaseEventUnion_1 | undefined> { return client_1.call("SubTypesEndpoint", "sendEvent", {}, init); }
export { receiveEvent_1 as receiveEvent, sendEvent_1 as sendEvent };
