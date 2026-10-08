import type Redis from 'ioredis';
import { ConsumerFinancial } from './consumers/ConsumerFinancial';

export function createFinancialConsumer(redis: Redis): ConsumerFinancial {
  return new ConsumerFinancial(redis);
}
