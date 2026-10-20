import { Event } from './Event';
import { EventStream } from './EventStream';
import { EventType } from './EventType';
import { InvalidPaymentApprovedPayloadError } from '../errors';
export class PaymentApprovedPayload {
  readonly orderId: string;
  readonly transactionId: string;
  readonly amount: number;
  readonly paidAt: string;
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
      payload.amount < 0 ||
      typeof payload.paidAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(payload.paidAt) ||
      !Number.isFinite(Date.parse(payload.paidAt)) ||
      new Date(payload.paidAt).toISOString().replace('.000Z', 'Z') !==
        payload.paidAt.replace('.000Z', 'Z')
    )
      throw new InvalidPaymentApprovedPayloadError();
    this.orderId = payload.orderId as string;
    this.transactionId = payload.transactionId as string;
    this.amount = payload.amount;
    this.paidAt = payload.paidAt as string;
  }
}
export class PaymentApprovedEvent extends Event<PaymentApprovedPayload> {
  constructor(
    eventId: string,
    payload: PaymentApprovedPayload | string | undefined,
    timestamp?: Date,
  ) {
    super(eventId, EventType.PaymentApproved, EventStream.Payments, payload, timestamp);
  }
  convertPayload(value: unknown): PaymentApprovedPayload {
    try {
      return value instanceof PaymentApprovedPayload
        ? value
        : new PaymentApprovedPayload(
            typeof value === 'string' ? (JSON.parse(value) as unknown) : value,
          );
    } catch {
      throw new InvalidPaymentApprovedPayloadError();
    }
  }
}
