import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { OrderCreatedHandler } from './payments/createOrderPayment/handlers/OrderCreatedHandler';
import { OrderPaymentRepository } from './payments/createOrderPayment/repositories/OrderPaymentRepository';
import { OrderRepository } from './payments/createOrderPayment/repositories/OrderRepository';
import { CreateOrderPayment } from './payments/createOrderPayment/usecases/CreateOrderPayment';
import { FinancialConsumer } from './payments/financial.consumer';
import { ConsumerSettings } from './shared/consumers/ConsumerSettings';
import { EventDispatcher } from './shared/consumers/EventDispatcher';
import { EventType } from './shared/events/EventType';
import { OrderCreatedEvent } from './shared/events/OrderCreatedEvent';
import { EventRedisService } from './shared/infrastructure/EventRedisService';
import { EventFactory, RedisConsumer } from './shared/infrastructure/RedisConsumer';

export function createFinancialConsumer(dataSource: DataSource, redis: Redis): FinancialConsumer {
  const dispatcher = new EventDispatcher();
  const eventFactories = new Map<EventType, EventFactory>([
    [
      EventType.OrderCreated,
      (id, payload, timestamp) => new OrderCreatedEvent(id, payload, timestamp),
    ],
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
        new OrderRepository(dataSource),
        new OrderPaymentRepository(dataSource),
        () => new Date(),
      ),
    ),
  );
}
