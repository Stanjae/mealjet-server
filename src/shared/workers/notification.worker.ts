import { Job, Worker } from "bullmq";
import { logger } from "@shared/utils/logger.js";
import { QUEUE_ACTIONS } from "@shared/constants/queue-actions.constants.js";
import type { TNotificationJob } from "@shared/types/queue.types.js";
import { NOTIFICATION_QUEUE_NAME } from "@shared/queues/notification.queue.js";
import { notificationService } from "@modules/notification";
import { workerConnection } from "@shared/config/queue-connection";

let notificationWorker: Worker<TNotificationJob> | null = null;

async function processNotificationJob(job: Job<TNotificationJob>) {
  const { dispatchId } = job.data;
  switch (job.name) {
    case QUEUE_ACTIONS.SEND_DISPATCH_OFFER:
      await notificationService.sendDispatchOfferNotification(dispatchId);
      return;
    default:
      logger.warn(`Unhandled notification job type: ${job.name}`);
  }

  logger.warn(`Unhandled notification job type: ${job.name}`);
}

export function startNotificationWorker() {
  if (notificationWorker) {
    return notificationWorker;
  }

  notificationWorker = new Worker<TNotificationJob>(
    NOTIFICATION_QUEUE_NAME,
    processNotificationJob,
    {
      connection: workerConnection,
      concurrency: 5,
    },
  );

  notificationWorker.on("ready", () =>
    logger.info("Notification worker ready"),
  );
  notificationWorker.on("failed", (job, err) => {
    logger.error(`Notification job failed: ${job?.id}`, err);
  });
  notificationWorker.on("error", (err) => {
    logger.error("Notification worker error", err);
  });

  return notificationWorker;
}

export async function stopNotificationWorker() {
  if (!notificationWorker) {
    return;
  }
  await notificationWorker.close();
  notificationWorker = null;
}
