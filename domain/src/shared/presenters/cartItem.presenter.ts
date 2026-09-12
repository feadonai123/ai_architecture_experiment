import { CartItem } from '../entities/CartItem';

export function presentCartItem(item: CartItem) {
  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
  };
}
