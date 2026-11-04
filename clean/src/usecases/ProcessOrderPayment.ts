import { UseCase } from '../base/useCase.base';
import { OrderPayment } from '../entities/OrderPayment';
import { OrderPaymentAttempt } from '../entities/OrderPaymentAttempt';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderPaymentStatus } from '../entities/OrderPaymentStatus';
import { PaymentToken } from '../entities/PaymentToken';
import { PaymentProvider } from '../entities/PaymentProvider';
import { parseUuid } from '../utils/parser';
import { PaymentApprovedEvent, PaymentApprovedPayload } from '../events/PaymentApprovedEvent';
import {
  PaymentDeclinedErrorEvent,
  PaymentDeclinedErrorPayload,
} from '../events/PaymentDeclinedErrorEvent';
import { IEventService } from '../ports/EventService';
import { OrderRepository } from '../ports/OrderRepository';
import { OrderPaymentRepository } from '../ports/OrderPaymentRepository';
import { OrderPaymentAttemptRepository } from '../ports/OrderPaymentAttemptRepository';
import { InvalidOrderIdError } from '../errors/InvalidOrderIdError';
import { InvalidPaymentTokenError } from '../errors/InvalidPaymentTokenError';
import { InvalidIdempotencyKeyError } from '../errors/InvalidIdempotencyKeyError';
import { IdempotencyKeyConflictError } from '../errors/IdempotencyKeyConflictError';
import { PaymentNotReadyError } from '../errors/PaymentNotReadyError';
import { InvalidOrderPaymentStateError } from '../errors/InvalidOrderPaymentStateError';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';

/**
 * RF06 second-chance policy: a payment may be attempted at most this many
 * times per order. The first `MAX_PAYMENT_ATTEMPTS - 1` declines stay
 * retryable (the order remains PAYMENT_PENDING, nothing is published); the
 * payment becomes final — and the corresponding event is published — on an
 * approval or once this many attempts have been made.
 */
export const MAX_PAYMENT_ATTEMPTS = 2;

export class ProcessOrderPayment extends UseCase<
  [orderId: unknown, paymentToken: unknown, idempotencyKey: unknown],
  OrderPayment
> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: OrderPaymentRepository,
    private readonly attempts: OrderPaymentAttemptRepository,
    private readonly events: IEventService,
    private readonly createId: () => string,
    private readonly now: () => Date,
  ) {
    super();
  }

  protected async execute(
    orderId: unknown,
    token: unknown,
    idempotencyKey: unknown,
  ): Promise<OrderPayment> {
    if (typeof orderId !== 'string' || parseUuid(orderId) === null)
      throw new InvalidOrderIdError(orderId);
    if (token !== PaymentToken.APPROVED && token !== PaymentToken.DECLINED)
      throw new InvalidPaymentTokenError();
    if (typeof idempotencyKey !== 'string' || parseUuid(idempotencyKey) === null)
      throw new InvalidIdempotencyKeyError();

    const order = await this.orders.findByIdForUpdate(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    const payment = await this.payments.findByOrderId(orderId);
    if (!payment) throw new PaymentNotReadyError(orderId);

    const previousAttempts = await this.attempts.findByOrderId(orderId);
    const replay = previousAttempts.find((attempt) => attempt.idempotencyKey === idempotencyKey);
    if (replay) {
      if (replay.paymentToken !== token) throw new IdempotencyKeyConflictError(idempotencyKey);
      return this.toOrderPayment(payment, replay);
    }

    if (payment.status === OrderPaymentStatus.PAID || payment.status === OrderPaymentStatus.DECLINED) {
      if (
        payment.status === OrderPaymentStatus.PAID &&
        (order.status === OrderStatus.PAYMENT_PENDING || order.status === OrderStatus.PAID)
      )
        return payment;
      if (
        payment.status === OrderPaymentStatus.DECLINED &&
        (order.status === OrderStatus.PAYMENT_PENDING || order.status === OrderStatus.CANCELED)
      )
        return payment;
      throw new InvalidOrderPaymentStateError(orderId);
    }

    if (order.status !== OrderStatus.PAYMENT_PENDING)
      throw new InvalidOrderPaymentStateError(orderId);

    // Reachable only while the payment is still PENDING, which this use case
    // always clears on the attempt that reaches MAX_PAYMENT_ATTEMPTS: the
    // order's row lock serializes attempts, so a later request always finds
    // payment.status already PAID or DECLINED and returns above instead.
    const attemptNumber = previousAttempts.length + 1;

    const approved = token === PaymentToken.APPROVED;
    const isFinalAttempt = approved || attemptNumber >= MAX_PAYMENT_ATTEMPTS;
    const transactionId = this.createId();
    const paidAt = approved ? this.now() : null;
    const attemptStatus = approved ? OrderPaymentStatus.PAID : OrderPaymentStatus.DECLINED;
    const paymentDetails = {
      provider: PaymentProvider.SIMULATED,
      transactionId,
      amount: order.total,
    };

    await this.attempts.create(
      new OrderPaymentAttempt(
        orderId,
        attemptNumber,
        idempotencyKey,
        token,
        attemptStatus,
        paymentDetails,
        paidAt,
        this.now(),
      ),
    );

    const attemptResult = new OrderPayment(
      orderId,
      attemptStatus,
      paymentDetails,
      paidAt,
      payment.createdAt,
    );

    if (!isFinalAttempt) return attemptResult;

    await this.payments.update(attemptResult);
    const eventId = this.createId();
    const payload = { orderId, transactionId, amount: order.total };
    const event = approved
      ? new PaymentApprovedEvent(
          eventId,
          new PaymentApprovedPayload({ ...payload, paidAt: paidAt!.toISOString() }),
        )
      : new PaymentDeclinedErrorEvent(eventId, new PaymentDeclinedErrorPayload(payload));
    await this.events.publishAfterCommit(event);
    return attemptResult;
  }

  private toOrderPayment(payment: OrderPayment, attempt: OrderPaymentAttempt): OrderPayment {
    return new OrderPayment(
      payment.orderId,
      attempt.status,
      attempt.paymentDetails,
      attempt.paidAt,
      payment.createdAt,
    );
  }
}
