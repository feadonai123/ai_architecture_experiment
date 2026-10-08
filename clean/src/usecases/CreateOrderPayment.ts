import { UseCase } from '../base/useCase.base';
import { OrderPayment } from '../entities/OrderPayment';
import { OrderPaymentStatus } from '../entities/OrderPaymentStatus';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
import { OrderPaymentRepository } from '../ports/OrderPaymentRepository';
import { OrderRepository } from '../ports/OrderRepository';
import { parseString } from '../utils/parser';

export class CreateOrderPayment extends UseCase<[orderId: string], void> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: OrderPaymentRepository,
    private readonly now: () => Date,
  ) {
    super();
  }

  protected async execute(orderId: string): Promise<void> {
    if (parseString(orderId) === null) throw new OrderNotFoundError(orderId);
    const order = await this.orders.findByIdForUpdate(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (await this.payments.findByOrderId(order.id)) return;
    await this.payments.create(
      new OrderPayment(order.id, OrderPaymentStatus.PENDING, null, null, this.now()),
    );
    order.status = OrderStatus.PAYMENT_PENDING;
    await this.orders.update(order);
  }
}
