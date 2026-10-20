import { UseCase } from '../../../shared/base/useCase.base';
import { OrderStatus } from '../../../shared/entities/OrderStatus';
import { Order } from '../../../shared/entities/Order';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
import { InvalidOrderPaymentStateError } from '../errors/InvalidOrderPaymentStateError';
export class ApproveOrderPayment extends UseCase<[orderId: string], void> {
  constructor(
    private readonly orders: {
      findByIdForUpdate(id: string): Promise<Order | null>;
      update(order: Order): Promise<void>;
    },
  ) {
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
