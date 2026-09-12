import { Cart } from '../../../shared/entities/Cart';
import { CartNotFoundError } from '../errors/CartNotFoundError';

export class GetCart {
  constructor(private readonly carts: { findWithItems(id: string): Promise<Cart | null> }) {}

  async execute(cartId: string): Promise<Cart> {
    const cart = await this.carts.findWithItems(cartId);
    if (!cart) {
      throw new CartNotFoundError(cartId);
    }
    return cart;
  }
}
