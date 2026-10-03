import Redis from 'ioredis';
import { Event } from '../events/Event';
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

export function setRedis(redis: Redis): void {
  client = redis;
}

export function createRedis(): Redis {
  const redis = new Redis(requireEnv('REDIS_URL'));
  setRedis(redis);
  return redis;
}

export function getRedis(): Redis {
  if (!client) {
    throw new Error('Redis has not been initialized');
  }
  return client;
}

export function ping(redis: Redis = getRedis()): Promise<string> {
  return redis.ping();
}

export function duplicate(redis: Redis = getRedis()): Redis {
  return redis.duplicate();
}

export function disconnect(redis: Redis = getRedis()): void {
  redis.disconnect();
}

export async function publish<TPayload>(
  event: Event<TPayload>,
  redis: Redis = getRedis(),
): Promise<string> {
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

export function createConsumerGroup(
  stream: string,
  group: string,
  startId: string = '0',
  redis: Redis = getRedis(),
): Promise<unknown> {
  return redis.xgroup('CREATE', stream, group, startId, 'MKSTREAM');
}

export async function readConsumerGroup(
  group: string,
  consumerName: string,
  streams: string[],
  batchSize: number,
  blockMilliseconds: number,
  redis: Redis = getRedis(),
): Promise<StreamResponse | null> {
  return (await redis.xreadgroup(
    'GROUP',
    group,
    consumerName,
    'COUNT',
    batchSize,
    'BLOCK',
    blockMilliseconds,
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

export function getHash(
  key: string,
  redis: Redis = getRedis(),
): Promise<Record<string, string>> {
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
  minimumIdleMilliseconds: number,
  entryId: string,
  redis: Redis = getRedis(),
): Promise<StreamMessage[]> {
  return (await redis.xclaim(
    stream,
    group,
    consumerName,
    minimumIdleMilliseconds,
    entryId,
  )) as StreamMessage[];
}

export async function saveHashAndSchedule(
  metadataKey: string,
  values: HashValues,
  scheduleKey: string,
  score: number,
  member: string,
  redis: Redis = getRedis(),
): Promise<void> {
  await redis.multi().hset(metadataKey, values).zadd(scheduleKey, score, member).exec();
}

export async function removeHashAndSchedule(
  metadataKey: string,
  scheduleKey: string,
  member: string,
  redis: Redis = getRedis(),
): Promise<void> {
  await redis.multi().zrem(scheduleKey, member).del(metadataKey).exec();
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
  const results = await redis
    .multi()
    .xack(stream, group, entryId)
    .zrem(scheduleKey, member)
    .del(metadataKey)
    .exec();

  if (!results || results.some(([commandError]) => commandError)) {
    throw new Error(`Failed to acknowledge retried event: ${entryId}`);
  }
}
