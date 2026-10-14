import { UseCase } from '../../../shared/base/useCase.base';
import { Order } from '../../../shared/entities/Order';
import { OrderPayment } from '../../../shared/entities/OrderPayment';
import { OrderPaymentStatus } from '../../../shared/entities/OrderPaymentStatus';
import { OrderStatus } from '../../../shared/entities/OrderStatus';
import { parseString } from '../../../utils/parser';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';

export class CreateOrderPayment extends UseCase<[orderId: string], void> {
  constructor(
    private readonly orders: {
      findByIdForUpdate(id: string): Promise<Order | null>;
      update(order: Order): Promise<void>;
    },
    private readonly payments: {
      findByOrderId(orderId: string): Promise<OrderPayment | null>;
      create(payment: OrderPayment): Promise<void>;
    },
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
