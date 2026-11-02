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
    case 'clean': {
      const { createOrderConsumer } = await import('../../clean/src/orderConsumerApp');
      return createOrderConsumer(dataSource, redis);
    }
    default:
      throw new Error(`Order consumer is not implemented for ${requireEnv('APP_TARGET')}`);
  }
}
