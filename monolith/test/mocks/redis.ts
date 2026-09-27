import type Redis from 'ioredis';

export function mockRedis(entryId: string | null = 'redis-entry-id'): Redis {
  return {
    xadd: jest.fn().mockResolvedValue(entryId),
    xack: jest.fn().mockResolvedValue(1),
  } as unknown as Redis;
}
