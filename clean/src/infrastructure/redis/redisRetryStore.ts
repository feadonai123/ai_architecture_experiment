import type Redis from 'ioredis';
import { RedisTransactionFailedError } from '../../errors/redisTransactionFailedError';

export type HashValues = Record<string, string | number>;

export function getHash(redis: Redis, key: string): Promise<Record<string, string>> {
  return redis.hgetall(key);
}

export function setHash(redis: Redis, key: string, values: HashValues): Promise<number> {
  return redis.hset(key, values);
}

export function listSortedSetByScore(
  redis: Redis,
  key: string,
  minimum: string | number,
  maximum: string | number,
  offset: number,
  count: number,
): Promise<string[]> {
  return redis.zrange(key, minimum, maximum, 'BYSCORE', 'LIMIT', offset, count);
}

export function removeSortedSetMember(redis: Redis, key: string, member: string): Promise<number> {
  return redis.zrem(key, member);
}

function ensureTransactionResult(
  results: Array<[Error | null, unknown]> | null,
  operation: string,
): void {
  if (!results || results.some(([error]) => error)) {
    throw new RedisTransactionFailedError(operation);
  }
}

export async function saveHashAndSchedule(
  redis: Redis,
  metadataKey: string,
  values: HashValues,
  scheduleKey: string,
  score: number,
  member: string,
): Promise<void> {
  ensureTransactionResult(
    await redis.multi().hset(metadataKey, values).zadd(scheduleKey, score, member).exec(),
    `schedule ${member}`,
  );
}

export async function removeHashAndSchedule(
  redis: Redis,
  metadataKey: string,
  scheduleKey: string,
  member: string,
): Promise<void> {
  ensureTransactionResult(
    await redis.multi().zrem(scheduleKey, member).del(metadataKey).exec(),
    `remove ${member}`,
  );
}

export async function acknowledgeAndRemoveHashAndSchedule(
  redis: Redis,
  stream: string,
  group: string,
  entryId: string,
  metadataKey: string,
  scheduleKey: string,
  member: string,
): Promise<void> {
  ensureTransactionResult(
    await redis
      .multi()
      .xack(stream, group, entryId)
      .zrem(scheduleKey, member)
      .del(metadataKey)
      .exec(),
    `acknowledge ${entryId}`,
  );
}
