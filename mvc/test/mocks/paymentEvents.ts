import * as redis from '../../src/services/redis';
export function mockPaymentPublish() {
  return jest.spyOn(redis, 'publish').mockResolvedValue('1-0');
}
