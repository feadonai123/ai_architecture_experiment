import { NextFunction, Request, Response } from 'express';
import { EmptyOrderItemsError } from '../../../errors/EmptyOrderItemsError';
import { InsufficientStockError } from '../../../errors/InsufficientStockError';
import { InvalidQuantityError } from '../../../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../../errors/ProductNotFoundError';
import { UserNotFoundError } from '../../../errors/UserNotFoundError';
import { OrderCreatedEvent, OrderCreatedPayload } from '../../../events/OrderCreatedEvent';
import { Order } from '../../../models/Order';
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

    const order = await Order.createWithItems(
      userId,
      validItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: productsById.get(item.productId)!.price,
      })),
    );

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
