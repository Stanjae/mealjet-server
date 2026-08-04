import { defaultQueue } from ".";
import type { JobsOptions } from "bullmq";
import { VerificationEmailJob } from "@shared/types/queue.types.js";

export const EMAIL_QUEUE_NAME = "email";

export const emailQueue = defaultQueue(EMAIL_QUEUE_NAME);

export async function enqueueEmailJob(
  action: string,
  data: VerificationEmailJob,
  options?: JobsOptions,
) {
  await emailQueue.add(action, data, options);
}
