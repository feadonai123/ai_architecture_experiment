import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { OrderConsumer, startOrderConsumer } from './consumers/consumerOrder';

export type OrderConsumerApp = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

export function createOrderConsumer(dataSource: DataSource, redis: Redis): OrderConsumerApp {
  let consumer: OrderConsumer | undefined;

  return {
    async start(): Promise<void> {
      if (!consumer) {
        consumer = startOrderConsumer(dataSource, redis);
      }
    },
    async stop(): Promise<void> {
      await consumer?.stop();
      consumer = undefined;
    },
  };
}
