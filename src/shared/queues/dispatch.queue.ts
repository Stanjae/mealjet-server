import { JobsOptions } from "bullmq";
import { TDispatchJob } from "@shared/types/queue.types.js";
import { defaultQueue } from ".";

export const DISPATCH_QUEUE_NAME = "dispatch";

const dispatchQueue = defaultQueue(DISPATCH_QUEUE_NAME);

export async function enqueueDispatchJob(
  action: string,
  data: TDispatchJob,
  options?: JobsOptions,
) {
  await dispatchQueue.add(action, data, options);
}
