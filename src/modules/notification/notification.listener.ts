import { QUEUE_ACTIONS } from "@shared/constants/queue-actions.constants";
import { eventHandler } from "@shared/events/event";
import { eventActions } from "@shared/events/event.actions";
import { enqueueNotificationJob } from "@shared/queues/notification.queue";

eventHandler.on(eventActions.OFFERS_CREATED, async (payload) => {
  const { dispatchId, dispatchAttemptId } = payload;
  await enqueueNotificationJob(QUEUE_ACTIONS.SEND_DISPATCH_OFFER, {
    dispatchId,
    dispatchAttemptId,
  });
});

eventHandler.on(eventActions.OFFER_ACCEPTED, async (payload) => {
  const { dispatchId, dispatchAttemptId, riderId } = payload;
  await enqueueNotificationJob(QUEUE_ACTIONS.SEND_DISPATCH_OFFER_ACCEPTED, {
    dispatchId,
    dispatchAttemptId,
    riderId,
  });
});

eventHandler.on(eventActions.DISPATCH_FAILED, async (payload) => {
  const { dispatchId, dispatchAttemptId, riderId } = payload;
  await enqueueNotificationJob(QUEUE_ACTIONS.SEND_DISPATCH_FAILED, {
    dispatchId,
    dispatchAttemptId,
    riderId,
  });
});
