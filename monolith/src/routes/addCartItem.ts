import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Product } from '../entities/Product';
import {
  CartNotFoundError,
  InsufficientStockError,
  InvalidQuantityError,
  ProductNotFoundError,
} from '../errors';
import { isValidQuantity, wrap } from '../helpers';
import { presentCart } from '../presenters/cart.presenter';
import { getCart } from './getCart';

export async function addCartItem(
  dataSource: DataSource,
  input: { cartId: string; productId: string; quantity: unknown },
): Promise<Cart> {
  if (!isValidQuantity(input.quantity)) {
    throw new InvalidQuantityError(input.quantity);
  }

  const product = await dataSource
    .getRepository(Product)
    .findOne({ where: { id: input.productId } });
  if (!product) {
    throw new ProductNotFoundError(input.productId);
  }

  const cart = await dataSource.getRepository(Cart).findOne({ where: { id: input.cartId } });
  if (!cart) {
    throw new CartNotFoundError(input.cartId);
  }

  const itemRepository = dataSource.getRepository(CartItem);
  const existing = await itemRepository.findOne({
    where: { cartId: input.cartId, productId: input.productId },
  });

  const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
  if (nextQuantity > product.stock) {
    throw new InsufficientStockError();
  }

  if (existing) {
    existing.quantity = nextQuantity;
    await itemRepository.save(existing);
  } else {
    await itemRepository.save(
      itemRepository.create({
        id: uuidv4(),
        cartId: input.cartId,
        productId: input.productId,
        quantity: input.quantity,
      }),
    );
  }

  return getCart(dataSource, input.cartId);
}

export function addCartItemRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const cart = await addCartItem(dataSource, {
      cartId: req.body.cartId,
      productId: req.body.productId,
      quantity: req.body.quantity,
    });
    res.status(201).json(presentCart(cart));
  });
}
