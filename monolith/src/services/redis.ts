import { Event } from '../events/Event';
import Redis from 'ioredis';
import { requireEnv } from '../helpers';

export function createRedis(): Redis {
  return new Redis(requireEnv('REDIS_URL'));
}

export async function publish<T>(redis: Redis, event: Event<T>): Promise<string> {
  const fields = Object.entries(event.toRedisStreamFields()).flatMap(([field, value]) => [
    field,
    value,
  ]);
  const id = await redis.xadd(event.getStream(), '*', ...fields);
  if (!id) throw new Error('Failed to publish ' + event.getType() + ' to Redis Stream');
  return id;
}
