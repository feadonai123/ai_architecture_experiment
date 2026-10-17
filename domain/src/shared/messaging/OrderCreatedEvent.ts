import { parseNonEmptyArray, parsePositiveInteger, parseRecord, parseString } from '../../utils/parser';
import { Event } from './Event';
import { EventStream } from './EventStream';
import { EventType } from './EventType';

export type OrderCreatedItem = { productId: string; quantity: number };

export class OrderCreatedPayload {
  readonly orderId: string;
  readonly userId: string;
  readonly items: OrderCreatedItem[];

  constructor(value: unknown) {
    const payload = parseRecord(value);
    const items = parseNonEmptyArray(payload?.items);
    if (
      !payload ||
      parseString(payload.orderId) === null ||
      parseString(payload.userId) === null ||
      !items ||
      !items.every((item) => {
        const entry = parseRecord(item);
        return (
          entry &&
          parseString(entry.productId) !== null &&
          parsePositiveInteger(entry.quantity) !== null
        );
      })
    ) {
      throw new Error('Invalid OrderCreated payload');
    }
    this.orderId = payload.orderId as string;
    this.userId = payload.userId as string;
    this.items = items.map((item) => {
      const entry = item as OrderCreatedItem;
      return { productId: entry.productId, quantity: entry.quantity };
    });
  }
}

export class OrderCreatedEvent extends Event<OrderCreatedPayload> {
  constructor(eventId: string, payload: OrderCreatedPayload, timestamp?: Date) {
    super(eventId, EventType.OrderCreated, EventStream.Orders, payload, timestamp);
  }

  protected convertPayload(value: unknown): OrderCreatedPayload {
    return value instanceof OrderCreatedPayload ? value : new OrderCreatedPayload(value);
  }
}
