import { ProductRepository } from './ordering/cancelOrderPayment/repositories/ProductRepository';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { ConsumerSettings } from './shared/consumers/ConsumerSettings';
import { EventDispatcher } from './shared/consumers/EventDispatcher';
import { OrderConsumer } from './ordering/order.consumer';
import { EventType } from './shared/events/EventType';
import { PaymentApprovedEvent } from './shared/events/PaymentApprovedEvent';
import { PaymentDeclinedErrorEvent } from './shared/events/PaymentDeclinedErrorEvent';
import { EventRedisService } from './shared/infrastructure/EventRedisService';
import { EventFactory, RedisConsumer } from './shared/infrastructure/RedisConsumer';
import { OrderRepository as ApprovedOrderRepository } from './ordering/approveOrderPayment/repositories/OrderRepository';
import { ApproveOrderPayment } from './ordering/approveOrderPayment/usecases/ApproveOrderPayment';
import { PaymentApprovedHandler } from './ordering/approveOrderPayment/handlers/PaymentApprovedHandler';
import { OrderRepository as DeclinedOrderRepository } from './ordering/cancelOrderPayment/repositories/OrderRepository';
import { CancelOrderPayment } from './ordering/cancelOrderPayment/usecases/CancelOrderPayment';
import { PaymentDeclinedHandler } from './ordering/cancelOrderPayment/handlers/PaymentDeclinedHandler';
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
      new ApproveOrderPayment(new ApprovedOrderRepository(dataSource)),
    ),
    new PaymentDeclinedHandler(
      dataSource,
      new CancelOrderPayment(
        new DeclinedOrderRepository(dataSource),
        new ProductRepository(dataSource),
      ),
    ),
  );
}
