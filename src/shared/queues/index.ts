import { queueConnection } from "@shared/config/queue-connection";
import { Queue } from "bullmq";

export const defaultQueue = (name: string) =>
  new Queue(name, {
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
