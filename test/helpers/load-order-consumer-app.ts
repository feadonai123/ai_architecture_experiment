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
    case 'mvc': {
      const { createOrderConsumer } = await import('../../mvc/src/orderConsumerApp');
      return createOrderConsumer(redis);
    }
    default:
      throw new Error(`Order consumer is not implemented for ${requireEnv('APP_TARGET')}`);
  }
}
