import { Cart } from '../entities/Cart';
import { formatIsoDateTime } from '../../utils/format';
import { presentCartItem } from './cartItem.presenter';

export function presentCart(cart: Cart) {
  return {
    id: cart.id,
    createdAt: formatIsoDateTime(cart.createdAt),
    items: cart.items.map(presentCartItem),
  };
}
