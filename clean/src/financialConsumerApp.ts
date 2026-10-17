import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { ConsumerSettings } from './consumers/consumerSettings';
import { EventDispatcher } from './consumers/eventDispatcher';
import { FinancialConsumer } from './consumers/financialConsumer';
import { OrderCreatedEvent } from './events/OrderCreatedEvent';
import { EventType } from './events/EventType';
import { OrderCreatedHandler } from './handler/orderCreated.handler';
import { EventFactory, RedisConsumer } from './infrastructure/redis/redisConsumer';
import { EventRedisService } from './infrastructure/redis/eventRedisService';
import { TypeOrmOrderPaymentRepository } from './repositories/TypeOrmOrderPaymentRepository';
import { TypeOrmOrderRepository } from './repositories/TypeOrmOrderRepository';
import { CreateOrderPayment } from './usecases/CreateOrderPayment';

export function createFinancialConsumer(dataSource: DataSource, redis: Redis): FinancialConsumer {
  const dispatcher = new EventDispatcher();
  const eventFactories = new Map<EventType, EventFactory>([
    [EventType.OrderCreated, (id, payload, timestamp) => new OrderCreatedEvent(id, payload, timestamp)],
  ]);
  const consumer = new RedisConsumer(
    new EventRedisService(redis),
    dispatcher,
    new ConsumerSettings('FINANCIAL_CONSUMER'),
    redis,
    eventFactories,
    'financial',
  );

  return new FinancialConsumer(
    consumer,
    dispatcher,
    new OrderCreatedHandler(
      dataSource,
      new CreateOrderPayment(
        new TypeOrmOrderRepository(dataSource),
        new TypeOrmOrderPaymentRepository(dataSource),
        () => new Date(),
      ),
    ),
  );
}
