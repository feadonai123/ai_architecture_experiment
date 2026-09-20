import { DataSource, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
// import { OrderCreatedEvent } from '../events/OrderCreatedEvent';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
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

export async function createOrder(dataSource: DataSource, input: CreateOrderInput): Promise<Order> {
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
      status: 'PENDING',
      total,
      createdAt: new Date(),
      items: orderItems,
    });

    const savedOrder = await orderRepository.save(newOrder);
    savedOrder.items = await orderItemRepository.save(orderItems);
    return savedOrder;
  });

  // TODO: publicar o evento OrderCreated no Redis Stream após a persistência bem-sucedida.
  // const event = new OrderCreatedEvent(
  //   order.id,
  //   order.userId,
  //   order.items.map(({ productId, quantity }) => ({ productId, quantity })),
  // );
  // const fields = Object.entries(event.toRedisStreamFields()).flat();
  // await redis.xadd(event.getStream(), '*', ...fields);

  return order;
}

export function createOrderRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const order = await createOrder(dataSource, {
      userId: req.body.userId,
      items: req.body.items,
    });
    res.status(201).json(presentOrder(order));
  });
}
