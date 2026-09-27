import { Event } from './Event';

export type OrderCreatedItem = {
  productId: string;
  quantity: number;
};

export type OrderCreatedPayload = {
  orderId: string;
  userId: string;
  items: OrderCreatedItem[];
};

export class OrderCreatedEvent extends Event<OrderCreatedPayload> {
  constructor(orderId: string, userId: string, items: OrderCreatedItem[], timestamp?: Date) {
    super(
      orderId,
      'OrderCreated',
      'orders',
      {
        orderId,
        userId,
        items,
      },
      timestamp,
    );
  }
}
