import { UseCase } from '../../../shared/base/useCase.base';
import { OrderPayment } from '../../../shared/entities/OrderPayment';
import { OrderPaymentAttempt } from '../../../shared/entities/OrderPaymentAttempt';
import { OrderStatus } from '../../../shared/entities/OrderStatus';
import { OrderPaymentStatus } from '../../../shared/entities/OrderPaymentStatus';
import { PaymentToken } from '../../../shared/entities/PaymentToken';
import { PaymentProvider } from '../../../shared/entities/PaymentProvider';
import { parseUuid } from '../../../utils/parser';
import {
  PaymentApprovedEvent,
  PaymentApprovedPayload,
} from '../../../shared/events/PaymentApprovedEvent';
import {
  PaymentDeclinedErrorEvent,
  PaymentDeclinedErrorPayload,
} from '../../../shared/events/PaymentDeclinedErrorEvent';
import { IEventService } from '../../../shared/events/EventService';
import { Order } from '../../../shared/entities/Order';
import { InvalidOrderIdError } from '../errors/InvalidOrderIdError';
import { InvalidPaymentTokenError } from '../errors/InvalidPaymentTokenError';
import { InvalidIdempotencyKeyError } from '../errors/InvalidIdempotencyKeyError';
import { PaymentNotReadyError } from '../errors/PaymentNotReadyError';
import { PaymentAttemptConflictError } from '../errors/PaymentAttemptConflictError';
import { InvalidOrderPaymentStateError } from '../errors/InvalidOrderPaymentStateError';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';

const MAX_ATTEMPTS = 2;

export class ProcessOrderPayment extends UseCase<
  [orderId: unknown, paymentToken: unknown, idempotencyKey: unknown],
  OrderPayment
> {
  constructor(
    private readonly orders: { findByIdForUpdate(id: string): Promise<Order | null> },
    private readonly payments: {
      findByOrderId(id: string): Promise<OrderPayment | null>;
      update(payment: OrderPayment): Promise<void>;
    },
    private readonly attempts: {
      findByOrderIdAndKey(
        orderId: string,
        idempotencyKey: string,
      ): Promise<OrderPaymentAttempt | null>;
      countByOrderId(orderId: string): Promise<number>;
      create(attempt: OrderPaymentAttempt): Promise<void>;
    },
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

    const existingAttempt = await this.attempts.findByOrderIdAndKey(orderId, idempotencyKey);
    if (existingAttempt) {
      if (existingAttempt.paymentToken !== token) throw new PaymentAttemptConflictError(orderId);
      return new OrderPayment(
        orderId,
        existingAttempt.status,
        existingAttempt.paymentDetails,
        existingAttempt.paidAt,
        payment.createdAt,
      );
    }

    const attemptsCount = await this.attempts.countByOrderId(orderId);
    if (
      payment.status !== OrderPaymentStatus.PENDING ||
      order.status !== OrderStatus.PAYMENT_PENDING ||
      attemptsCount >= MAX_ATTEMPTS
    )
      throw new InvalidOrderPaymentStateError(orderId);

    const attemptNumber = attemptsCount + 1;
    const approved = token === PaymentToken.APPROVED;
    const transactionId = this.createId();
    const paidAt = approved ? this.now() : null;
    const paymentDetails = { provider: PaymentProvider.SIMULATED, transactionId, amount: order.total };
    await this.attempts.create(
      new OrderPaymentAttempt(
        orderId,
        idempotencyKey,
        attemptNumber,
        token,
        approved ? OrderPaymentStatus.PAID : OrderPaymentStatus.DECLINED,
        paymentDetails,
        paidAt,
        this.now(),
      ),
    );

    if (!approved && attemptNumber < MAX_ATTEMPTS) {
      // First decline: the order keeps its PAYMENT_PENDING state and reserved
      // stock, ready for a second attempt. No event is published.
      return new OrderPayment(orderId, OrderPaymentStatus.DECLINED, paymentDetails, null, payment.createdAt);
    }

    const result = new OrderPayment(
      orderId,
      approved ? OrderPaymentStatus.PAID : OrderPaymentStatus.DECLINED,
      paymentDetails,
      paidAt,
      payment.createdAt,
    );
    await this.payments.update(result);
    const eventId = this.createId();
    const payload = { orderId, transactionId, amount: order.total };
    const event = approved
      ? new PaymentApprovedEvent(
          eventId,
          new PaymentApprovedPayload({ ...payload, paidAt: paidAt!.toISOString() }),
        )
      : new PaymentDeclinedErrorEvent(eventId, new PaymentDeclinedErrorPayload(payload));
    await this.events.publishAfterCommit(event);
    return result;
  }
}
