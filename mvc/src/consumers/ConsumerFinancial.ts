import type Redis from 'ioredis';
import { getDataSource } from '../database';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
import { OrderPaymentStatus } from '../enums/OrderPaymentStatus';
import { OrderStatus } from '../enums/OrderStatus';
import { EventType } from '../events/EventType';
import { OrderCreatedEvent } from '../events/OrderCreatedEvent';
import { Order } from '../models/Order';
import { OrderPayment } from '../models/OrderPayment';
import { Logger } from '../utils/Logger';
import { ConfigConsumer } from './ConfigConsumer';
import { Consumer } from './Consumer';

export class ConsumerFinancial extends Consumer {
  constructor(
    redis: Redis,
    config: ConfigConsumer = new ConfigConsumer('FINANCIAL_CONSUMER', [EventType.OrderCreated]),
  ) {
    super(config, redis, 'financial');
  }

  protected async processEvent(
    type: EventType,
    eventId: string,
    payload: string | undefined,
  ): Promise<void> {
    switch (type) {
      case EventType.OrderCreated:
        await this.handleOrderCreated(new OrderCreatedEvent(eventId, payload));
        return;
      default:
        throw new Error(`Unsupported financial event: ${type}`);
    }
  }

  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const payload = event.getPayload();
    if (payload.orderId.trim().length === 0) {
      throw new OrderNotFoundError(payload.orderId);
    }
    await getDataSource().transaction(async (manager) => {
      const order = await Order.findByIdForUpdate(payload.orderId, manager);
      if (!order) {
        throw new OrderNotFoundError(payload.orderId);
      }

      const existingPayment = await OrderPayment.findByOrderId(payload.orderId, manager);
      if (existingPayment) {
        return;
      }

      await OrderPayment.create(
        {
          orderId: order.id,
          status: OrderPaymentStatus.PENDING,
          paymentDetails: null,
          paidAt: null,
          createdAt: new Date(),
        },
        manager,
      );
      order.status = OrderStatus.PAYMENT_PENDING;
      await Order.update(order, manager);
    });
    Logger.info(`financial consumer handled ${event.getType()}`, {
      eventId: event.getId(),
      orderId: payload.orderId,
      userId: payload.userId,
      items: payload.items,
    });
  }
}
