import { Job, Worker } from "bullmq";
import { logger } from "@shared/utils/logger.js";
import { QUEUE_ACTIONS } from "@shared/constants/queue-actions.constants.js";
import type { TDispatchJob } from "@shared/types/queue.types.js";
import { DISPATCH_QUEUE_NAME } from "@shared/queues/dispatch.queue.js";
import { dispatchService } from "@modules/dispatch";
import { workerConnection } from "@shared/config/queue-connection";

let dispatchWorker: Worker<TDispatchJob> | null = null;

async function processDispatchJob(job: Job<TDispatchJob>) {
  const { dispatchId } = job.data;
  switch (job.name) {
    case QUEUE_ACTIONS.START_DISPATCH:
      await dispatchService.startDispatch(dispatchId);
      return;
    case QUEUE_ACTIONS.RETRY_DISPATCH:
      await dispatchService.retryDispatch(dispatchId);
      return;
    default:
      logger.warn(`Unhandled dispatch job type: ${job.name}`);
  }

  logger.warn(`Unhandled dispatch job type: ${job.name}`);
}

export function startDispatchWorker() {
  if (dispatchWorker) {
    return dispatchWorker;
  }

  dispatchWorker = new Worker<TDispatchJob>(
    DISPATCH_QUEUE_NAME,
    processDispatchJob,
    {
      connection: workerConnection,
      concurrency: 5,
    },
  );

  dispatchWorker.on("ready", () => logger.info("Dispatch worker ready"));
  dispatchWorker.on("failed", (job, err) => {
    logger.error(`Dispatch job failed: ${job?.id}`, err);
  });
  dispatchWorker.on("error", (err) => {
    logger.error("Dispatch worker error", err);
  });

  return dispatchWorker;
}

export async function stopDispatchWorker() {
  if (!dispatchWorker) {
    return;
  }
  await dispatchWorker.close();
  dispatchWorker = null;
}
