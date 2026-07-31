import { QueueOptions, WorkerOptions } from "bullmq";
import { env } from "./env";

const redisUrl = new URL(env.REDIS_URL);

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: redisUrl.pathname ? Number(redisUrl.pathname.replace("/", "") || 0) : 0,
  maxRetriesPerRequest: null,
} as const;

export const queueConnection: QueueOptions["connection"] = connection;

export const workerConnection: WorkerOptions["connection"] = connection;
