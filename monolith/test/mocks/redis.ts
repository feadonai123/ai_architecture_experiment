import type Redis from 'ioredis';

export function mockRedis(entryId: string | null = 'redis-entry-id'): Redis {
  const transaction = {
    del: jest.fn(),
    exec: jest.fn().mockResolvedValue([]),
    hset: jest.fn(),
    xack: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
  };
  for (const command of ['del', 'hset', 'xack', 'zadd', 'zrem'] as const) {
    transaction[command].mockReturnValue(transaction);
  }

  return {
    hgetall: jest.fn().mockResolvedValue({}),
    hset: jest.fn().mockResolvedValue(1),
    multi: jest.fn().mockReturnValue(transaction),
    xadd: jest.fn().mockResolvedValue(entryId),
    xack: jest.fn().mockResolvedValue(1),
    xclaim: jest.fn().mockResolvedValue([]),
    xpending: jest.fn().mockResolvedValue([]),
    xreadgroup: jest.fn().mockResolvedValue(null),
    zrange: jest.fn().mockResolvedValue([]),
    zrem: jest.fn().mockResolvedValue(1),
  } as unknown as Redis;
}
