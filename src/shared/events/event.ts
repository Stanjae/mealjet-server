import { EventEmitter } from "events";

class EventBus extends EventEmitter {}

export const eventHandler = new EventBus();
