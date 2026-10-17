import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from '../../../database';
import { EmptyOrderItemsError } from '../../../errors/EmptyOrderItemsError';
import { InsufficientStockError } from '../../../errors/InsufficientStockError';
import { InvalidQuantityError } from '../../../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../../errors/ProductNotFoundError';
import { UserNotFoundError } from '../../../errors/UserNotFoundError';
import { OrderStatus } from '../../../enums/OrderStatus';
import { OrderCreatedEvent, OrderCreatedPayload } from '../../../events/OrderCreatedEvent';
import { Order } from '../../../models/Order';
import { OrderItem } from '../../../models/OrderItem';
import { Product } from '../../../models/Product';
import { User } from '../../../models/User';
import { presentOrder } from '../../../presenters/order.presenter';
import { publish } from '../../../services/redis';

type CreateOrderItemInput = {
  productId: string;
  quantity: unknown;
};

type ValidCreateOrderItemInput = {
  productId: string;
  quantity: number;
};

function isValidQuantity(quantity: unknown): quantity is number {
  return typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0;
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, items: inputItems } = req.body;

    if (!Array.isArray(inputItems) || inputItems.length === 0) {
      throw new EmptyOrderItemsError();
    }

    const items = inputItems as CreateOrderItemInput[];
    for (const item of items) {
      if (!isValidQuantity(item?.quantity)) {
        throw new InvalidQuantityError(item?.quantity);
      }
    }
    const validItems = items as ValidCreateOrderItemInput[];

    const user = await User.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const productIds = [...new Set(validItems.map((item) => item.productId))];
    const products = await Product.findByIds(productIds);
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

    const orderId = uuidv4();
    const orderItems = validItems.map((item) => ({
      id: uuidv4(),
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: productsById.get(item.productId)!.price,
    }));
    const totalInCents = orderItems.reduce(
      (total, item) => total + item.quantity * Math.round(item.unitPrice * 100),
      0,
    );
    const order = await getDataSource().transaction(async (manager) => {
      const savedOrder = await Order.create(
        {
          id: orderId,
          userId,
          status: OrderStatus.PENDING,
          total: totalInCents / 100,
          createdAt: new Date(),
        },
        manager,
      );
      savedOrder.items = await OrderItem.create(orderItems, manager);
      return savedOrder;
    });

    const payload = new OrderCreatedPayload({
      orderId: order.id,
      userId: order.userId,
      items: order.items.map(({ productId, quantity }) => ({ productId, quantity })),
    });
    const event = new OrderCreatedEvent(order.id, payload);
    await publish(event);

    res.status(201).json(presentOrder(order));
  } catch (error) {
    next(error);
  }
}
