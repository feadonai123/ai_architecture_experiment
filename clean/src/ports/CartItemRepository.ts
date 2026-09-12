import { CartItem } from '../entities/CartItem';

export interface CartItemRepository {
  findByCartAndProduct(cartId: string, productId: string): Promise<CartItem | null>;
  save(item: CartItem): Promise<void>;
  remove(item: CartItem): Promise<void>;
}
