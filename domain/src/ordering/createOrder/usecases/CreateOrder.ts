import { UseCase } from '../../../shared/base/useCase.base';
import { Order } from '../../../shared/entities/Order';
import { OrderItem } from '../../../shared/entities/OrderItem';
import { OrderStatus } from '../../../shared/entities/OrderStatus';
import { Product } from '../../../shared/entities/Product';
import { IEventService } from '../../../shared/messaging/EventService';
import { OrderCreatedEvent, OrderCreatedPayload } from '../../../shared/messaging/OrderCreatedEvent';
import { parseNonEmptyArray, parsePositiveInteger } from '../../../utils/parser';
import { EmptyOrderItemsError } from '../errors/EmptyOrderItemsError';
import { InsufficientStockError } from '../errors/InsufficientStockError';
import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { UserNotFoundError } from '../errors/UserNotFoundError';

export type CreateOrderInput = { userId: string; items: unknown };
type ItemInput = { productId: string; quantity: unknown };

export class CreateOrder extends UseCase<[CreateOrderInput], Order> {
  constructor(
    private readonly users: { exists(id: string): Promise<boolean> },
    private readonly products: { findById(id: string): Promise<Product | null> },
    private readonly orders: { create(order: Order): Promise<void> },
    private readonly orderItems: { create(items: OrderItem[]): Promise<void> },
    private readonly events: IEventService,
    private readonly createId: () => string,
    private readonly now: () => Date,
  ) {
    super();
  }

  protected async execute(input: CreateOrderInput): Promise<Order> {
    const items = parseNonEmptyArray(input.items) as ItemInput[] | null;
    if (!items) throw new EmptyOrderItemsError();
    for (const item of items) {
      if (parsePositiveInteger(item?.quantity) === null) {
        throw new InvalidQuantityError(item?.quantity);
      }
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
    for (const item of validItems) {
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }
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
    await this.events.publishAfterCommit(
      new OrderCreatedEvent(
        order.id,
        new OrderCreatedPayload({
          orderId: order.id,
          userId: order.userId,
          items: order.items.map(({ productId, quantity }) => ({ productId, quantity })),
        }),
      ),
    );
    return order;
  }
}
