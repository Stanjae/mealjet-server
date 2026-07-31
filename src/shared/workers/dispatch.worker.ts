import { Job, Worker } from "bullmq";
import { logger } from "@shared/utils/logger.js";
import { workerConnection } from "../config/queue-connection.js";
import { QUEUE_ACTIONS } from "@shared/constants/queue-actions.constants.js";
import type { TDispatchJob } from "@shared/types/queue.types.js";
import { DISPATCH_QUEUE_NAME } from "@shared/queues/dispatch.queue.js";

let dispatchWorker: Worker<TDispatchJob> | null = null;

async function processDispatchJob(job: Job<TDispatchJob>) {
  if (job.name === QUEUE_ACTIONS.MARK_ORDER_AS_READY) {
    const { dispatchId } = job.data;
    // Process the dispatch job using the dispatchId
    return;
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
