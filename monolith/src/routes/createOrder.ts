import type Redis from 'ioredis';
import { DataSource, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { OrderStatus } from '../enums/OrderStatus';
import { OrderCreatedEvent, OrderCreatedPayload } from '../events/OrderCreatedEvent';
import {
  EmptyOrderItemsError,
  InsufficientStockError,
  InvalidQuantityError,
  ProductNotFoundError,
  UserNotFoundError,
} from '../errors';
import { isValidQuantity, wrap } from '../helpers';
import { presentOrder } from '../presenters/order.presenter';


type CreateOrderItemInput = {
  productId: string;
  quantity: unknown;
};

type ValidCreateOrderItemInput = {
  productId: string;
  quantity: number;
};

type CreateOrderInput = {
  userId: string;
  items: unknown;
};

export async function createOrder(
  dataSource: DataSource,
  redis: Redis,
  input: CreateOrderInput,
): Promise<Order> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new EmptyOrderItemsError();
  }

  const items = input.items as CreateOrderItemInput[];
  for (const item of items) {
    if (!isValidQuantity(item?.quantity)) {
      throw new InvalidQuantityError(item?.quantity);
    }
  }
  const validItems = items as ValidCreateOrderItemInput[];

  const user = await dataSource.getRepository(User).findOne({ where: { id: input.userId } });
  if (!user) {
    throw new UserNotFoundError(input.userId);
  }

  const productIds = [...new Set(validItems.map((item) => item.productId))];
  const products = await dataSource.getRepository(Product).find({
    where: { id: In(productIds) },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));

  for (const productId of productIds) {
    if (!productsById.has(productId)) {
      throw new ProductNotFoundError(productId);
    }
  }

  const quantitiesByProduct = new Map<string, number>();
  for (const item of validItems) {
    quantitiesByProduct.set(
      item.productId,
      (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }

  for (const [productId, quantity] of quantitiesByProduct) {
    if (quantity > productsById.get(productId)!.stock) {
      throw new InsufficientStockError();
    }
  }

  const order = await dataSource.transaction(async (manager) => {
    const orderRepository = manager.getRepository(Order);
    const orderItemRepository = manager.getRepository(OrderItem);
    const id = uuidv4();
    const orderItems = validItems.map((item) => {
      const product = productsById.get(item.productId)!;
      return orderItemRepository.create({
        id: uuidv4(),
        orderId: id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    });
    const totalInCents = orderItems.reduce(
      (currentTotal, item) => currentTotal + item.quantity * Math.round(item.unitPrice * 100),
      0,
    );
    const total = totalInCents / 100;
    const newOrder = orderRepository.create({
      id,
      userId: input.userId,
      status: OrderStatus.PENDING,
      total,
      createdAt: new Date(),
      items: orderItems,
    });

    const savedOrder = await orderRepository.save(newOrder);
    savedOrder.items = await orderItemRepository.save(orderItems);
    return savedOrder;
  });

  const payload = new OrderCreatedPayload({
    orderId: order.id,
    userId: order.userId,
    items: order.items.map(({ productId, quantity }) => ({ productId, quantity })),
  });
  const event = new OrderCreatedEvent(order.id, payload);

  const fields = Object.entries(event.toRedisStreamFields()).flatMap(([field, value]) => [
    field,
    value,
  ]);
  const entryId = await redis.xadd(event.getStream(), '*', ...fields);

  if (!entryId) {
    throw new Error(`Failed to publish ${event.getType()} to Redis Stream`);
  }
  return order;
}

export function createOrderRoute(dataSource: DataSource, redis: Redis) {
  return wrap(async (req, res) => {
    const order = await createOrder(dataSource, redis, {
      userId: req.body.userId,
      items: req.body.items,
    });
    res.status(201).json(presentOrder(order));
  });
}
