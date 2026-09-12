import { DataSource } from 'typeorm';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { CartItemNotFoundError } from '../errors';
import { wrap } from '../helpers';
import { presentCart } from '../presenters/cart.presenter';
import { getCart } from './getCart';

export async function removeCartItem(
  dataSource: DataSource,
  cartId: string,
  productId: string,
): Promise<Cart> {
  await getCart(dataSource, cartId);

  const itemRepository = dataSource.getRepository(CartItem);
  const item = await itemRepository.findOne({ where: { cartId, productId } });
  if (!item) {
    throw new CartItemNotFoundError(productId);
  }

  await itemRepository.remove(item);
  return getCart(dataSource, cartId);
}

export function removeCartItemRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const cart = await removeCartItem(
      dataSource,
      String(req.query.cartId ?? ''),
      req.params.productId,
    );
    res.status(200).json(presentCart(cart));
  });
}
