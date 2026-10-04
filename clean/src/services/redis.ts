import Redis from 'ioredis';
import { requireEnv } from '../utils/env';

let client: Redis | undefined;

export function createRedis(): Redis {
  client = new Redis(requireEnv('REDIS_URL'));
  return client;
}

export function getRedis(): Redis {
  if (!client) {
    throw new Error('Redis has not been initialized');
  }
  return client;
}

export function ping(): Promise<string> {
  return getRedis().ping();
}

export function addStreamEntry(
  stream: string,
  fields: Record<string, string>,
  redis: Redis = getRedis(),
): Promise<string | null> {
  const values = Object.entries(fields).flatMap(([key, value]) => [key, value]);
  return redis.xadd(stream, '*', ...values);
}
