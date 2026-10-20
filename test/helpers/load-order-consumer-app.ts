import type Redis from 'ioredis';
import type { DataSource } from 'typeorm';
import { requireEnv } from './env';

export type TestOrderConsumer = {
  start(): void | Promise<void>;
  stop(): Promise<void>;
};

export async function createTestOrderConsumer(
  dataSource: DataSource,
  redis: Redis,
): Promise<TestOrderConsumer> {
  switch (requireEnv('APP_TARGET')) {
    case 'monolith': {
      const { createOrderConsumer } = await import('../../monolith/src/orderConsumerApp');
      return createOrderConsumer(dataSource, redis);
    }
    case 'mvc': {
      const { createOrderConsumer } = await import('../../mvc/src/orderConsumerApp');
      return createOrderConsumer(redis);
    }
    case 'clean': {
      const { createOrderConsumer } = await import('../../clean/src/orderConsumerApp');
      return createOrderConsumer(dataSource, redis);
    }
    case 'domain': {
      const { createOrderConsumer } = await import('../../domain/src/orderConsumerApp');
      return createOrderConsumer(dataSource, redis);
    }
    default:
      throw new Error(`Order consumer is not implemented for ${requireEnv('APP_TARGET')}`);
  }
}
