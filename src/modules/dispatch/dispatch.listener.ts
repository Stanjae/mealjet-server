import { eventHandler } from "@shared/events/event";
import dispatchService from "./dispatch.service";
import { eventActions } from "@shared/events/event.actions";

eventHandler.on(eventActions.STARTED, async (payload) => {
  const { orderId } = payload;
  await dispatchService.createDispatch(orderId);
});
