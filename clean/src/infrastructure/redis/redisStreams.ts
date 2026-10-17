import type Redis from 'ioredis';

export type StreamMessage = [entryId: string, fields: string[]];
export type StreamResponse = [stream: string, messages: StreamMessage[]][];
export type PendingEntry = [
  entryId: string,
  consumer: string,
  idleTime: number,
  deliveryCount: number,
];

export function addStreamEntry(
  redis: Redis,
  stream: string,
  fields: Record<string, string>,
): Promise<string | null> {
  const values = Object.entries(fields).flatMap(([key, value]) => [key, value]);
  return redis.xadd(stream, '*', ...values);
}

export function createConsumerGroup(redis: Redis, stream: string, group: string): Promise<unknown> {
  return redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
}

export async function readConsumerGroup(
  redis: Redis,
  group: string,
  consumerName: string,
  streams: readonly string[],
  batchSize: number,
  blockMs: number,
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
  redis: Redis,
  stream: string,
  group: string,
  entryId: string,
): Promise<number> {
  return redis.xack(stream, group, entryId);
}

export async function listPending(
  redis: Redis,
  stream: string,
  group: string,
  startId: string,
  endId: string,
  count: number,
): Promise<PendingEntry[]> {
  return (await redis.xpending(stream, group, startId, endId, count)) as PendingEntry[];
}

export async function claimPendingEntry(
  redis: Redis,
  stream: string,
  group: string,
  consumerName: string,
  minimumIdleMs: number,
  entryId: string,
): Promise<StreamMessage[]> {
  return (await redis.xclaim(
    stream,
    group,
    consumerName,
    minimumIdleMs,
    entryId,
  )) as StreamMessage[];
}
