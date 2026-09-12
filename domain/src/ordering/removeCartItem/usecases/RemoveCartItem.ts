import { Cart } from '../../../shared/entities/Cart';
import { CartItem } from '../../../shared/entities/CartItem';
import { CartItemNotFoundError } from '../errors/CartItemNotFoundError';
import { CartNotFoundError } from '../errors/CartNotFoundError';

export class RemoveCartItem {
  constructor(
    private readonly carts: {
      findById(id: string): Promise<Cart | null>;
      findWithItems(id: string): Promise<Cart | null>;
    },
    private readonly cartItems: {
      findByCartAndProduct(cartId: string, productId: string): Promise<CartItem | null>;
      remove(item: CartItem): Promise<void>;
    },
  ) {}

  async execute(cartId: string, productId: string): Promise<Cart> {
    const cart = await this.carts.findById(cartId);
    if (!cart) {
      throw new CartNotFoundError(cartId);
    }

    const item = await this.cartItems.findByCartAndProduct(cartId, productId);
    if (!item) {
      throw new CartItemNotFoundError(productId);
    }

    await this.cartItems.remove(item);
    const updated = await this.carts.findWithItems(cartId);
    return updated!;
  }
}
