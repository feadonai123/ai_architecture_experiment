import * as redisService from '../../src/services/redis';

export function mockPublish(entryId: string = 'redis-entry-id') {
  return jest.spyOn(redisService, 'publish').mockResolvedValue(entryId);
}
