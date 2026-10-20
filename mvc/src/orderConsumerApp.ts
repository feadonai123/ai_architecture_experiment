import type Redis from 'ioredis';
import { OrderConsumer } from './consumers/OrderConsumer';
export function createOrderConsumer(redis: Redis): OrderConsumer {
  return new OrderConsumer(redis);
}
