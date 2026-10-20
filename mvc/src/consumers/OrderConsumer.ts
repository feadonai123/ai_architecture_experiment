import { Product } from '../models/Product';
import { OrderItem } from '../models/OrderItem';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import type Redis from 'ioredis';
import { getDataSource } from '../database';
import { Order } from '../models/Order';
import { OrderStatus } from '../enums/OrderStatus';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
import { InvalidOrderPaymentStateError } from '../errors/InvalidOrderPaymentStateError';
import { EventType } from '../events/EventType';
import { PaymentApprovedEvent } from '../events/PaymentApprovedEvent';
import { PaymentDeclinedErrorEvent } from '../events/PaymentDeclinedErrorEvent';
import { Logger } from '../utils/Logger';
import { ConfigConsumer } from './ConfigConsumer';
import { RedisConsumer } from './RedisConsumer';
export class OrderConsumer extends RedisConsumer {
  constructor(
    redis: Redis,
    config = new ConfigConsumer('ORDER_CONSUMER', [
      EventType.PaymentApproved,
      EventType.PaymentDeclinedError,
    ]),
  ) {
    super(config, redis, 'order');
  }
  protected async processEvent(
    type: EventType,
    eventId: string,
    payload: string | undefined,
  ): Promise<void> {
    switch (type) {
      case EventType.PaymentApproved:
        await this.handlePaymentApproved(new PaymentApprovedEvent(eventId, payload));
        return;
      case EventType.PaymentDeclinedError:
        await this.handlePaymentDeclined(new PaymentDeclinedErrorEvent(eventId, payload));
        return;
    }
  }
  private async handlePaymentApproved(event: PaymentApprovedEvent): Promise<void> {
    const payload = event.getPayload();
    await getDataSource().transaction(async (manager) => {
      const order = await Order.findByIdForUpdate(payload.orderId, manager);
      if (!order) throw new OrderNotFoundError(payload.orderId);
      if (order.status === OrderStatus.PAID) return;
      if (order.status !== OrderStatus.PAYMENT_PENDING)
        throw new InvalidOrderPaymentStateError(payload.orderId);
      order.status = OrderStatus.PAID;
      await Order.update(order, manager);
    });
    Logger.info('order consumer handled PaymentApproved', { eventId: event.getId(), ...payload });
  }
  private async handlePaymentDeclined(event: PaymentDeclinedErrorEvent): Promise<void> {
    const payload = event.getPayload();
    await getDataSource().transaction(async (manager) => {
      const order = await Order.findByIdForUpdate(payload.orderId, manager);
      if (!order) throw new OrderNotFoundError(payload.orderId);
      if (order.status === OrderStatus.CANCELED) return;
      if (order.status !== OrderStatus.PAYMENT_PENDING)
        throw new InvalidOrderPaymentStateError(payload.orderId);
      const items = await OrderItem.findByOrderId(order.id, manager);
      const quantities = new Map<string, number>();
      for (const item of items) {
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      }
      for (const productId of [...quantities.keys()].sort()) {
        const product = await Product.findByIdForUpdate(productId, manager, true);
        if (!product) throw new ProductNotFoundError(productId);
        product.stock += quantities.get(productId)!;
        await Product.save(product, manager);
      }
      order.status = OrderStatus.CANCELED;
      await Order.update(order, manager);
    });
    Logger.info('order consumer handled PaymentDeclinedError', {
      eventId: event.getId(),
      ...payload,
    });
  }
}
