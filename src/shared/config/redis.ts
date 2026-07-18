import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '@shared/utils/logger.js';

class RedisClient {
  private static instance: Redis;

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(env.REDIS_URL, {
        retryStrategy: (times) => Math.min(times * 100, 3000),
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      RedisClient.instance.on('connect', () => logger.info('Redis connected'));
      RedisClient.instance.on('error', (err) => logger.error('Redis error', err));
      RedisClient.instance.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    }
    return RedisClient.instance;
  }
}

export const redis = RedisClient.getInstance();

// Helper wrappers with typed generics
export const redisGet = async <T>(key: string): Promise<T | null> => {
  const val = await redis.get(key);
  return val ? (JSON.parse(val) as T) : null;
};

export const redisSet = async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
  const serialized = JSON.stringify(value);
  if (ttlSeconds !== undefined) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
};

export const redisDel = async (key: string): Promise<void> => {
  await redis.del(key);
};
