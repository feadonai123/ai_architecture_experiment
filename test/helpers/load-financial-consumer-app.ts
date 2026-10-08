import type Redis from 'ioredis';
import type { DataSource } from 'typeorm';
import { requireEnv } from './env';

export type TestFinancialConsumer = {
  start(): void | Promise<void>;
  stop(): Promise<void>;
};

export async function createTestFinancialConsumer(
  dataSource: DataSource,
  redis: Redis,
): Promise<TestFinancialConsumer> {
  switch (requireEnv('APP_TARGET')) {
    case 'monolith': {
      const { createFinancialConsumer } = await import('../../monolith/src/financialConsumerApp');
      return createFinancialConsumer(dataSource, redis);
    }
    case 'mvc': {
      const { createFinancialConsumer } = await import('../../mvc/src/financialConsumerApp');
      return createFinancialConsumer(redis);
    }
    case 'clean': {
      const { createFinancialConsumer } = await import('../../clean/src/financialConsumerApp');
      return createFinancialConsumer(dataSource, redis);
    }
    default:
      throw new Error(`Financial consumer is not implemented for ${requireEnv('APP_TARGET')}`);
  }
}
