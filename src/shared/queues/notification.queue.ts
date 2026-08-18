import { JobsOptions } from "bullmq";
import { TNotificationJob } from "@shared/types/queue.types.js";
import { defaultQueue } from "./index.js";

export const NOTIFICATION_QUEUE_NAME = "notification";

const notificationQueue = defaultQueue(NOTIFICATION_QUEUE_NAME);

export async function enqueueNotificationJob(
  action: string,
  data: TNotificationJob,
  options?: JobsOptions,
) {
  await notificationQueue.add(action, data, options);
}
