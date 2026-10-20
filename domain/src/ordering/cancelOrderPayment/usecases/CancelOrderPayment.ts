import { Product } from '../../../shared/entities/Product';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { UseCase } from '../../../shared/base/useCase.base';
import { OrderStatus } from '../../../shared/entities/OrderStatus';
import { Order } from '../../../shared/entities/Order';
import { OrderNotFoundError } from '../errors/OrderNotFoundError';
import { InvalidOrderPaymentStateError } from '../errors/InvalidOrderPaymentStateError';
export class CancelOrderPayment extends UseCase<[orderId: string], void> {
  constructor(
    private readonly orders: {
      findByIdForUpdate(id: string): Promise<Order | null>;
      update(order: Order): Promise<void>;
    },
    private readonly products: {
      findByIdForUpdate(id: string): Promise<Product | null>;
      save(product: Product): Promise<void>;
    },
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
      const product = await this.products.findByIdForUpdate(productId);
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
