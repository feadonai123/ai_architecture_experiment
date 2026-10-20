import { UseCase } from '../base/useCase.base';
import { Order } from '../entities/Order';
import { parseUuid } from '../utils/parser';
import { InvalidOrderIdError } from '../errors/InvalidOrderIdError';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
import { OrderRepository } from '../ports/OrderRepository';
export class GetOrderStatus extends UseCase<[orderId: unknown], Order> {
  constructor(private readonly orders: OrderRepository) {
    super();
  }
  protected async execute(orderId: unknown): Promise<Order> {
    if (typeof orderId !== 'string' || parseUuid(orderId) === null)
      throw new InvalidOrderIdError(orderId);
    const order = await this.orders.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    return order;
  }
}
