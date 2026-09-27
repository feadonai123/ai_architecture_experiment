import Redis from 'ioredis';
import type { Event } from '../events/Event';
import { requireEnv } from '../helpers';

export function createRedis(): Redis {
  return new Redis(requireEnv('REDIS_URL'));
}

export async function publish(redis: Redis, event: Event<unknown>): Promise<string> {
  const fields = Object.entries(event.toRedisStreamFields()).flatMap(([field, value]) => [
    field,
    value,
  ]);
  const entryId = await redis.xadd(event.getStream(), '*', ...fields);

  if (!entryId) {
    throw new Error(`Failed to publish ${event.getType()} to Redis Stream`);
  }

  return entryId;
}
