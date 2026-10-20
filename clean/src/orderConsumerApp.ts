import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { ConsumerSettings } from './consumers/consumerSettings';
import { EventDispatcher } from './consumers/eventDispatcher';
import { OrderConsumer } from './consumers/orderConsumer';
import { EventType } from './events/EventType';
import { PaymentApprovedEvent } from './events/PaymentApprovedEvent';
import { PaymentDeclinedErrorEvent } from './events/PaymentDeclinedErrorEvent';
import { EventRedisService } from './infrastructure/redis/eventRedisService';
import { EventFactory, RedisConsumer } from './infrastructure/redis/redisConsumer';
import { TypeOrmOrderRepository } from './repositories/TypeOrmOrderRepository';
import { ApproveOrderPayment } from './usecases/ApproveOrderPayment';
import { PaymentApprovedHandler } from './handler/paymentApproved.handler';
import { CancelOrderPayment } from './usecases/CancelOrderPayment';
import { PaymentDeclinedHandler } from './handler/paymentDeclined.handler';
export function createOrderConsumer(dataSource: DataSource, redis: Redis): OrderConsumer {
  const dispatcher = new EventDispatcher();
  const factories = new Map<EventType, EventFactory>([
    [
      EventType.PaymentApproved,
      (id, payload, timestamp) => new PaymentApprovedEvent(id, payload, timestamp),
    ],
    [
      EventType.PaymentDeclinedError,
      (id, payload, timestamp) => new PaymentDeclinedErrorEvent(id, payload, timestamp),
    ],
  ]);
  const consumer = new RedisConsumer(
    new EventRedisService(redis),
    dispatcher,
    new ConsumerSettings('ORDER_CONSUMER'),
    redis,
    factories,
    'order',
  );
  return new OrderConsumer(
    consumer,
    dispatcher,
    new PaymentApprovedHandler(
      dataSource,
      new ApproveOrderPayment(new TypeOrmOrderRepository(dataSource)),
    ),
    new PaymentDeclinedHandler(
      dataSource,
      new CancelOrderPayment(new TypeOrmOrderRepository(dataSource)),
    ),
  );
}
