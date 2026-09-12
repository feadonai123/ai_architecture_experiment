import { Cart } from '../entities/Cart';
import { presentCartItem } from './cartItem.presenter';

export function presentCart(cart: Cart) {
  return {
    id: cart.id,
    createdAt: new Date(cart.createdAt).toISOString(),
    items: cart.items.map(presentCartItem),
  };
}
