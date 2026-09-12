import { DataSource } from 'typeorm';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { CartNotFoundError } from '../errors';
import { wrap } from '../helpers';
import { presentCart } from '../presenters/cart.presenter';

export async function getCart(dataSource: DataSource, cartId: string): Promise<Cart> {
  const cart = await dataSource.getRepository(Cart).findOne({ where: { id: cartId } });
  if (!cart) {
    throw new CartNotFoundError(cartId);
  }
  cart.items = await dataSource.getRepository(CartItem).find({ where: { cartId } });
  return cart;
}

export function getCartRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const cart = await getCart(dataSource, req.params.cartId);
    res.status(200).json(presentCart(cart));
  });
}
