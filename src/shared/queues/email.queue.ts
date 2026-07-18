import { Queue } from "bullmq";
import { queueConnection } from "./queue-connection.js";

export const EMAIL_QUEUE_NAME = "email";

export type VerificationEmailJob = {
  to: string;
  name: string;
  token: string;
  isLogin?: boolean;
};

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1500,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export async function enqueueVerificationEmailJob(data: VerificationEmailJob) {
  await emailQueue.add("send-verification-email", data);
}
