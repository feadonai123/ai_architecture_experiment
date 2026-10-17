import Redis from 'ioredis';
import { requireEnv } from '../../utils/env';

export function createRedis(): Redis {
  return new Redis(requireEnv('REDIS_URL'));
}

export function ping(redis: Redis): Promise<string> {
  return redis.ping();
}

export function duplicate(redis: Redis): Redis {
  return redis.duplicate();
}

export function disconnect(redis: Redis): void {
  redis.disconnect();
}
