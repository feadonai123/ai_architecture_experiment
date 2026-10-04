import { UseCase } from '../base/useCase.base';
import { OrderPayment } from '../entities/OrderPayment';
import { OrderPaymentStatus } from '../entities/OrderPaymentStatus';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
import { OrderCreatedEvent } from '../events/OrderCreatedEvent';
import { OrderPaymentRepository } from '../ports/OrderPaymentRepository';
import { OrderRepository } from '../ports/OrderRepository';

export class ProcessOrderCreated extends UseCase<[OrderCreatedEvent], void> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: OrderPaymentRepository,
    private readonly now: () => Date,
  ) {
    super();
  }

  protected async execute(event: OrderCreatedEvent): Promise<void> {
    const payload = event.getPayload();
    const order = await this.orders.findByIdForUpdate(payload.orderId);
    if (!order) throw new OrderNotFoundError(payload.orderId);
    if (await this.payments.findByOrderId(order.id)) return;
    await this.payments.create(
      new OrderPayment(order.id, OrderPaymentStatus.PENDING, null, null, this.now()),
    );
    order.status = OrderStatus.PAYMENT_PENDING;
    await this.orders.update(order);
  }
}
