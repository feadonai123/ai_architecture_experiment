import Redis from 'ioredis';
import { requireEnv } from '../utils/env';

export type StreamMessage = [entryId: string, fields: string[]];
export type StreamResponse = [stream: string, messages: StreamMessage[]][];
export type PendingEntry = [
  entryId: string,
  consumer: string,
  idleTime: number,
  deliveryCount: number,
];
export type HashValues = Record<string, string | number>;

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

export function duplicate(redis: Redis = getRedis()): Redis {
  return redis.duplicate();
}

export function disconnect(redis: Redis = getRedis()): void {
  redis.disconnect();
}

export function createConsumerGroup(
  stream: string,
  group: string,
  redis: Redis = getRedis(),
): Promise<unknown> {
  return redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
}

export async function readConsumerGroup(
  group: string,
  consumerName: string,
  streams: readonly string[],
  batchSize: number,
  blockMs: number,
  redis: Redis = getRedis(),
): Promise<StreamResponse | null> {
  return (await redis.xreadgroup(
    'GROUP',
    group,
    consumerName,
    'COUNT',
    batchSize,
    'BLOCK',
    blockMs,
    'STREAMS',
    ...streams,
    ...streams.map(() => '>'),
  )) as StreamResponse | null;
}

export function acknowledge(
  stream: string,
  group: string,
  entryId: string,
  redis: Redis = getRedis(),
): Promise<number> {
  return redis.xack(stream, group, entryId);
}

export async function listPending(
  stream: string,
  group: string,
  startId: string,
  endId: string,
  count: number,
  redis: Redis = getRedis(),
): Promise<PendingEntry[]> {
  return (await redis.xpending(stream, group, startId, endId, count)) as PendingEntry[];
}

export function getHash(key: string, redis: Redis = getRedis()): Promise<Record<string, string>> {
  return redis.hgetall(key);
}

export function setHash(
  key: string,
  values: HashValues,
  redis: Redis = getRedis(),
): Promise<number> {
  return redis.hset(key, values);
}

export function listSortedSetByScore(
  key: string,
  minimum: string | number,
  maximum: string | number,
  offset: number,
  count: number,
  redis: Redis = getRedis(),
): Promise<string[]> {
  return redis.zrange(key, minimum, maximum, 'BYSCORE', 'LIMIT', offset, count);
}

export function removeSortedSetMember(
  key: string,
  member: string,
  redis: Redis = getRedis(),
): Promise<number> {
  return redis.zrem(key, member);
}

export async function claimPendingEntry(
  stream: string,
  group: string,
  consumerName: string,
  minimumIdleMs: number,
  entryId: string,
  redis: Redis = getRedis(),
): Promise<StreamMessage[]> {
  return (await redis.xclaim(
    stream,
    group,
    consumerName,
    minimumIdleMs,
    entryId,
  )) as StreamMessage[];
}

function ensureTransactionResult(
  results: Array<[Error | null, unknown]> | null,
  operation: string,
): void {
  if (!results || results.some(([error]) => error)) {
    throw new Error(`Redis transaction failed: ${operation}`);
  }
}

export async function saveHashAndSchedule(
  metadataKey: string,
  values: HashValues,
  scheduleKey: string,
  score: number,
  member: string,
  redis: Redis = getRedis(),
): Promise<void> {
  ensureTransactionResult(
    await redis.multi().hset(metadataKey, values).zadd(scheduleKey, score, member).exec(),
    `schedule ${member}`,
  );
}

export async function removeHashAndSchedule(
  metadataKey: string,
  scheduleKey: string,
  member: string,
  redis: Redis = getRedis(),
): Promise<void> {
  ensureTransactionResult(
    await redis.multi().zrem(scheduleKey, member).del(metadataKey).exec(),
    `remove ${member}`,
  );
}

export async function acknowledgeAndRemoveHashAndSchedule(
  stream: string,
  group: string,
  entryId: string,
  metadataKey: string,
  scheduleKey: string,
  member: string,
  redis: Redis = getRedis(),
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
