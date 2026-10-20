import { UseCase } from '../base/useCase.base';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderRepository } from '../ports/OrderRepository';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
import { InvalidOrderPaymentStateError } from '../errors/InvalidOrderPaymentStateError';
export class ApproveOrderPayment extends UseCase<[orderId: string], void> {
  constructor(private readonly orders: OrderRepository) {
    super();
  }
  protected async execute(orderId: string): Promise<void> {
    const order = await this.orders.findByIdForUpdate(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status === OrderStatus.PAID) return;
    if (order.status !== OrderStatus.PAYMENT_PENDING)
      throw new InvalidOrderPaymentStateError(orderId);
    order.status = OrderStatus.PAID;
    await this.orders.update(order);
  }
}
