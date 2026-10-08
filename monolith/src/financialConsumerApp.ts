import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import {
  FinancialConsumer,
  startFinancialConsumer,
} from './consumers/consumerFinancial';

export type FinancialConsumerApp = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

export function createFinancialConsumer(
  dataSource: DataSource,
  redis: Redis,
): FinancialConsumerApp {
  let consumer: FinancialConsumer | undefined;

  return {
    async start(): Promise<void> {
      if (!consumer) {
        consumer = startFinancialConsumer(dataSource, redis);
      }
    },
    async stop(): Promise<void> {
      await consumer?.stop();
      consumer = undefined;
    },
  };
}
