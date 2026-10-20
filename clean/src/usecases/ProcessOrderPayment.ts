import { UseCase } from '../base/useCase.base';
import { OrderPayment } from '../entities/OrderPayment';
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
import { InvalidOrderIdError } from '../errors/InvalidOrderIdError';
import { InvalidPaymentTokenError } from '../errors/InvalidPaymentTokenError';
import { PaymentNotReadyError } from '../errors/PaymentNotReadyError';
import { InvalidOrderPaymentStateError } from '../errors/InvalidOrderPaymentStateError';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
export class ProcessOrderPayment extends UseCase<
  [orderId: unknown, paymentToken: unknown],
  OrderPayment
> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: OrderPaymentRepository,
    private readonly events: IEventService,
    private readonly createId: () => string,
    private readonly now: () => Date,
  ) {
    super();
  }
  protected async execute(orderId: unknown, token: unknown): Promise<OrderPayment> {
    if (typeof orderId !== 'string' || parseUuid(orderId) === null)
      throw new InvalidOrderIdError(orderId);
    if (token !== PaymentToken.APPROVED && token !== PaymentToken.DECLINED)
      throw new InvalidPaymentTokenError();
    const order = await this.orders.findByIdForUpdate(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    const payment = await this.payments.findByOrderId(orderId);
    if (!payment) throw new PaymentNotReadyError(orderId);
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
    if (
      payment.status !== OrderPaymentStatus.PENDING ||
      order.status !== OrderStatus.PAYMENT_PENDING
    )
      throw new InvalidOrderPaymentStateError(orderId);
    const approved = token === PaymentToken.APPROVED;
    const transactionId = this.createId();
    const paidAt = approved ? this.now() : null;
    const result = new OrderPayment(
      orderId,
      approved ? OrderPaymentStatus.PAID : OrderPaymentStatus.DECLINED,
      { provider: PaymentProvider.SIMULATED, transactionId, amount: order.total },
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
