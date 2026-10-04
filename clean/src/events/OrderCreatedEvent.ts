import { InvalidOrderCreatedPayloadError } from '../errors/InvalidOrderCreatedPayloadError';
import { Event } from './Event';
import { EventStream } from './EventStream';
import { EventType } from './EventType';

export type OrderCreatedItem = { productId: string; quantity: number };

export class OrderCreatedPayload {
  readonly orderId: string;
  readonly userId: string;
  readonly items: OrderCreatedItem[];

  constructor(value: unknown) {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('orderId' in value) ||
      typeof value.orderId !== 'string' ||
      !('userId' in value) ||
      typeof value.userId !== 'string' ||
      !('items' in value) ||
      !Array.isArray(value.items) ||
      !value.items.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'productId' in item &&
          typeof item.productId === 'string' &&
          'quantity' in item &&
          typeof item.quantity === 'number' &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      )
    )
      throw new InvalidOrderCreatedPayloadError();
    this.orderId = value.orderId;
    this.userId = value.userId;
    this.items = value.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  }
}

export class OrderCreatedEvent extends Event<OrderCreatedPayload> {
  constructor(
    eventId: string,
    payload: OrderCreatedPayload | string | undefined,
    timestamp?: Date,
  ) {
    super(eventId, EventType.OrderCreated, EventStream.Orders, payload, timestamp);
  }

  protected convertPayload(value: unknown): OrderCreatedPayload {
    try {
      return new OrderCreatedPayload(
        typeof value === 'string' ? (JSON.parse(value) as unknown) : value,
      );
    } catch {
      throw new InvalidOrderCreatedPayloadError();
    }
  }
}
