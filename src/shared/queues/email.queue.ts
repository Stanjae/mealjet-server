import { TVerificationEmailJob } from "@shared/types/queue.types.js";
import { defaultQueue } from ".";
import { JobsOptions } from "bullmq";

export const EMAIL_QUEUE_NAME = "email";

export const emailQueue = defaultQueue(EMAIL_QUEUE_NAME);

export async function enqueueVerificationEmailJob(
  action: string,
  data: TVerificationEmailJob,
  options?: JobsOptions,
) {
  await emailQueue.add(action, data, options);
}
