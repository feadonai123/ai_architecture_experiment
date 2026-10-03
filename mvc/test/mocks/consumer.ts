import type Redis from 'ioredis';
import { ConfigConsumer } from '../../src/consumers/ConfigConsumer';
import { EventStream } from '../../src/events/EventStream';
import { EventType } from '../../src/events/EventType';

export function mockConsumerConfig(): ConfigConsumer {
  return {
    group: 'financial',
    streams: [EventStream.Orders],
    supportedEvents: [EventType.OrderCreated],
    batchSize: 10,
    readBlockMs: 5000,
    readErrorDelayMs: 1000,
    retryIntervalMs: 10000,
    retryReconcileIntervalMs: 60000,
    retryProcessingLeaseMs: 60000,
    retryReconcileBatchSize: 100,
    retryScheduleKey: 'financial:retry:schedule',
    retryEventKeyPrefix: 'financial:retry:event',
    retryMaxAttempts: 6,
    deadLetterStream: 'financial:dead-letter',
  } as ConfigConsumer;
}

export function mockConsumerRedis(): Redis {
  const transaction = {
    hset: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    del: jest.fn(),
    xack: jest.fn(),
    exec: jest.fn().mockResolvedValue([]),
  };
  for (const command of ['hset', 'zadd', 'zrem', 'del', 'xack'] as const) {
    transaction[command].mockReturnValue(transaction);
  }
  const redis = {
    duplicate: jest.fn(),
    disconnect: jest.fn(),
    xack: jest.fn().mockResolvedValue(1),
    xadd: jest.fn().mockResolvedValue('dead-letter-entry'),
    xpending: jest.fn().mockResolvedValue([]),
    xclaim: jest.fn().mockResolvedValue([]),
    hgetall: jest.fn().mockResolvedValue({}),
    hset: jest.fn().mockResolvedValue(1),
    zrange: jest.fn().mockResolvedValue([]),
    zrem: jest.fn().mockResolvedValue(1),
    multi: jest.fn().mockReturnValue(transaction),
  };
  redis.duplicate.mockReturnValue(redis);
  return redis as unknown as Redis;
}
