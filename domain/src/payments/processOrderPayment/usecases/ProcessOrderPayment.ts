import { UseCase } from '../../../shared/base/useCase.base';
import { OrderPayment } from '../../../shared/entities/OrderPayment';
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
import { PaymentNotReadyError } from '../errors/PaymentNotReadyError';
import { InvalidOrderPaymentStateError } from '../errors/InvalidOrderPaymentStateError';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
export class ProcessOrderPayment extends UseCase<
  [orderId: unknown, paymentToken: unknown],
  OrderPayment
> {
  constructor(
    private readonly orders: { findByIdForUpdate(id: string): Promise<Order | null> },
    private readonly payments: {
      findByOrderId(id: string): Promise<OrderPayment | null>;
      update(payment: OrderPayment): Promise<void>;
    },
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
