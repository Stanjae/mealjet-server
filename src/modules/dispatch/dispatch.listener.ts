import { eventHandler } from "@shared/events/event";
import { DispatchEvents } from "./dispatch.constant";
import dispatchService from "./dispatch.service";

eventHandler.on(DispatchEvents.STARTED, async (payload) => {
  const { orderId } = payload;
  await dispatchService.createDispatch(orderId);
});
