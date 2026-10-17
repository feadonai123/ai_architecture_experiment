import type Redis from 'ioredis';
import * as redisService from '../../src/services/redis';

export function mockPublish(entryId: string = 'redis-entry-id') {
  return jest.spyOn(redisService, 'publish').mockResolvedValue(entryId);
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
