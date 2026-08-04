import { Job, Worker } from "bullmq";
import { logger } from "@shared/utils/logger.js";
import { sendVerificationEmail } from "@shared/utils/email-util.js";
import { EMAIL_QUEUE_NAME } from "../queues/email.queue.js";
import { workerConnection } from "../config/queue-connection.js";
import { VerificationEmailJob } from "@shared/types/queue.types.js";

let emailWorker: Worker<VerificationEmailJob> | null = null;

async function processEmailJob(job: Job<VerificationEmailJob>) {
  if (job.name === "send-verification-email") {
    const { to, name, token, isLogin } = job.data;
    await sendVerificationEmail(to, name, token, isLogin);
    return;
  }

  logger.warn(`Unhandled email job type: ${job.name}`);
}

export function startEmailWorker() {
  if (emailWorker) {
    return emailWorker;
  }

  emailWorker = new Worker<VerificationEmailJob>(
    EMAIL_QUEUE_NAME,
    processEmailJob,
    {
      connection: workerConnection,
      concurrency: 5,
    },
  );

  emailWorker.on("ready", () => logger.info("Email worker ready"));
  emailWorker.on("failed", (job, err) => {
    logger.error(`Email job failed: ${job?.id}`, err);
  });
  emailWorker.on("error", (err) => {
    logger.error("Email worker error", err);
  });

  return emailWorker;
}

export async function stopEmailWorker() {
  if (!emailWorker) {
    return;
  }
  await emailWorker.close();
  emailWorker = null;
}
