import { Event } from './Event';
import { EventStream } from './EventStream';
import { EventType } from './EventType';
import { InvalidPaymentDeclinedPayloadError } from './InvalidPaymentDeclinedPayloadError';
import { parseRecord, parseUuid, parseNonNegativeNumber } from '../../utils/parser';
export class PaymentDeclinedErrorPayload {
  readonly orderId: string;
  readonly transactionId: string;
  readonly amount: number;
  constructor(value: unknown) {
    const payload = parseRecord(value);

    if (
      !payload ||
      parseUuid(payload.orderId) === null ||
      parseUuid(payload.transactionId) === null ||
      typeof payload.amount !== 'number' ||
      parseNonNegativeNumber(payload.amount) === null
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
  protected convertPayload(value: unknown): PaymentDeclinedErrorPayload {
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
