import { UseCase } from '../base/useCase.base';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderStatus } from '../entities/OrderStatus';
import { Product } from '../entities/Product';
import { EmptyOrderItemsError } from '../errors/EmptyOrderItemsError';
import { InsufficientStockError } from '../errors/InsufficientStockError';
import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { UserNotFoundError } from '../errors/UserNotFoundError';
import { OrderCreatedEvent, OrderCreatedPayload } from '../events/OrderCreatedEvent';
import { IEventService } from '../ports/IEventService';
import { OrderItemRepository } from '../ports/OrderItemRepository';
import { OrderRepository } from '../ports/OrderRepository';
import { ProductRepository } from '../ports/ProductRepository';
import { UserRepository } from '../ports/UserRepository';
import { parsePositiveInteger } from '../utils/parser';

export type CreateOrderInput = { userId: string; items: unknown };
type ItemInput = { productId: string; quantity: unknown };

export class CreateOrder extends UseCase<[CreateOrderInput], Order> {
  constructor(
    private readonly users: UserRepository,
    private readonly products: ProductRepository,
    private readonly orders: OrderRepository,
    private readonly orderItems: OrderItemRepository,
    private readonly events: IEventService,
    private readonly createId: () => string,
    private readonly now: () => Date,
  ) {
    super();
  }

  protected async execute(input: CreateOrderInput): Promise<Order> {
    if (!Array.isArray(input.items) || input.items.length === 0) throw new EmptyOrderItemsError();
    const items = input.items as ItemInput[];
    for (const item of items) {
      if (parsePositiveInteger(item?.quantity) === null)
        throw new InvalidQuantityError(item?.quantity);
    }
    const validItems = items as Array<{ productId: string; quantity: number }>;

    if (!(await this.users.exists(input.userId))) throw new UserNotFoundError(input.userId);

    const productIds = [...new Set(validItems.map((item) => item.productId))];
    const productsById = new Map<string, Product>();
    for (const productId of productIds) {
      const product = await this.products.findById(productId);
      if (!product) throw new ProductNotFoundError(productId);
      productsById.set(productId, product);
    }

    const quantitiesByProduct = new Map<string, number>();
    for (const item of validItems)
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    for (const [productId, quantity] of quantitiesByProduct) {
      if (quantity > productsById.get(productId)!.stock) throw new InsufficientStockError();
    }

    const orderId = this.createId();
    const orderItems = validItems.map(
      (item) =>
        new OrderItem(
          this.createId(),
          orderId,
          item.productId,
          item.quantity,
          productsById.get(item.productId)!.price,
        ),
    );
    const totalInCents = orderItems.reduce(
      (total, item) => total + item.quantity * Math.round(item.unitPrice * 100),
      0,
    );
    const order = new Order(
      orderId,
      input.userId,
      OrderStatus.PENDING,
      totalInCents / 100,
      this.now(),
      orderItems,
    );
    await this.orders.create(order);
    await this.orderItems.create(orderItems);
    const event = new OrderCreatedEvent(
      order.id,
      new OrderCreatedPayload({
        orderId: order.id,
        userId: order.userId,
        items: order.items.map(({ productId, quantity }) => ({ productId, quantity })),
      }),
    );
    await this.events.publishAfterCommit(event);
    return order;
  }
}
