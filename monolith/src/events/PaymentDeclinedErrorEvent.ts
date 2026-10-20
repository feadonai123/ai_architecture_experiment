import { Event } from './Event';
import { EventStream } from './EventStream';
import { EventType } from './EventType';
import { InvalidPaymentDeclinedPayloadError } from '../errors';
export class PaymentDeclinedErrorPayload {
  readonly orderId: string;
  readonly transactionId: string;
  readonly amount: number;
  constructor(value: unknown) {
    const payload =
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      !payload ||
      typeof payload.orderId !== 'string' ||
      !uuid.test(payload.orderId) ||
      typeof payload.transactionId !== 'string' ||
      !uuid.test(payload.transactionId) ||
      typeof payload.amount !== 'number' ||
      !Number.isFinite(payload.amount) ||
      payload.amount < 0
    )
      throw new InvalidPaymentDeclinedPayloadError();
    this.orderId = payload.orderId as string;
    this.transactionId = payload.transactionId as string;
    this.amount = payload.amount;
  }
}
export class PaymentDeclinedErrorEvent extends Event<PaymentDeclinedErrorPayload> {
  constructor(
    eventId: string,
    payload: PaymentDeclinedErrorPayload | string | undefined,
    timestamp?: Date,
  ) {
    super(eventId, EventType.PaymentDeclinedError, EventStream.Payments, payload, timestamp);
  }
  convertPayload(value: unknown): PaymentDeclinedErrorPayload {
    try {
      return value instanceof PaymentDeclinedErrorPayload
        ? value
        : new PaymentDeclinedErrorPayload(
            typeof value === 'string' ? (JSON.parse(value) as unknown) : value,
          );
    } catch {
      throw new InvalidPaymentDeclinedPayloadError();
    }
  }
}
