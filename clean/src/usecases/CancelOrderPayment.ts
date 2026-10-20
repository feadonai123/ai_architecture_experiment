import { Product } from '../entities/Product';
import { ProductRepository } from '../ports/ProductRepository';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { UseCase } from '../base/useCase.base';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderRepository } from '../ports/OrderRepository';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
import { InvalidOrderPaymentStateError } from '../errors/InvalidOrderPaymentStateError';
export class CancelOrderPayment extends UseCase<[orderId: string], void> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
  ) {
    super();
  }
  protected async execute(orderId: string): Promise<void> {
    const order = await this.orders.findByIdForUpdate(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status === OrderStatus.CANCELED) return;
    if (order.status !== OrderStatus.PAYMENT_PENDING)
      throw new InvalidOrderPaymentStateError(orderId);
    const quantities = new Map<string, number>();
    for (const item of order.items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    for (const productId of [...quantities.keys()].sort()) {
      const product = await this.products.findByIdForUpdate(productId, true);
      if (!product) throw new ProductNotFoundError(productId);
      await this.products.save(
        new Product(
          product.id,
          product.name,
          product.slug,
          product.description,
          product.price,
          product.stock + quantities.get(productId)!,
          product.deletedAt,
        ),
      );
    }
    order.status = OrderStatus.CANCELED;
    await this.orders.update(order);
  }
}
