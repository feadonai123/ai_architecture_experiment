import { Cart } from '../entities/Cart';
import { CartNotFoundError } from '../errors/CartNotFoundError';
import { CartRepository } from '../ports/CartRepository';

export class GetCart {
  constructor(private readonly carts: CartRepository) {}

  async execute(cartId: string): Promise<Cart> {
    const cart = await this.carts.findWithItems(cartId);
    if (!cart) {
      throw new CartNotFoundError(cartId);
    }
    return cart;
  }
}
