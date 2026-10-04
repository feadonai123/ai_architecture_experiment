import { DataSource, In, IsNull } from 'typeorm';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Product } from '../entities/Product';
import { CartNotFoundError } from '../errors';
import { wrap } from '../helpers';
import { presentCart } from '../presenters/cart.presenter';

async function loadVisibleItems(dataSource: DataSource, cartId: string): Promise<CartItem[]> {
  const items = await dataSource.getRepository(CartItem).find({ where: { cartId } });
  if (items.length === 0) {
    return [];
  }
  const active = await dataSource.getRepository(Product).find({
    where: { id: In(items.map((item) => item.productId)), deletedAt: IsNull() },
  });
  const activeIds = new Set(active.map((product) => product.id));
  return items.filter((item) => activeIds.has(item.productId));
}

export async function getCart(dataSource: DataSource, cartId: string): Promise<Cart> {
  const cart = await dataSource.getRepository(Cart).findOne({ where: { id: cartId } });
  if (!cart) {
    throw new CartNotFoundError(cartId);
  }
  cart.items = await loadVisibleItems(dataSource, cartId);
  return cart;
}

export function getCartRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const cart = await getCart(dataSource, req.params.cartId);
    res.status(200).json(presentCart(cart));
  });
}
