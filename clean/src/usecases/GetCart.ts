import { UseCase } from '../base/useCase.base';
import { Cart } from '../entities/Cart';
import { CartNotFoundError } from '../errors/CartNotFoundError';
import { CartRepository } from '../ports/CartRepository';

export class GetCart extends UseCase<[string], Cart> {
  constructor(private readonly carts: CartRepository) {
    super();
  }

  protected async execute(cartId: string): Promise<Cart> {
    const cart = await this.carts.findWithItems(cartId);
    if (!cart) {
      throw new CartNotFoundError(cartId);
    }
    return cart;
  }
}
