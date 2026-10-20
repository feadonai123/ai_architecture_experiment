import { Event } from './Event';
import { EventStream } from './EventStream';
import { EventType } from './EventType';
import { InvalidPaymentApprovedPayloadError } from '../errors/InvalidPaymentApprovedPayloadError';
import { parseRecord, parseUuid, parseNonNegativeNumber, parseUtcIsoDate } from '../utils/parser';
export class PaymentApprovedPayload {
  readonly orderId: string;
  readonly transactionId: string;
  readonly amount: number;
  readonly paidAt: string;
  constructor(value: unknown) {
    const payload = parseRecord(value);

    if (
      !payload ||
      parseUuid(payload.orderId) === null ||
      parseUuid(payload.transactionId) === null ||
      typeof payload.amount !== 'number' ||
      parseNonNegativeNumber(payload.amount) === null ||
      parseUtcIsoDate(payload.paidAt) === null
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
  protected convertPayload(value: unknown): PaymentApprovedPayload {
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
