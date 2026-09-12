import { UseCase } from '../../../shared/base/useCase.base';
import { Cart } from '../../../shared/entities/Cart';
import { CartNotFoundError } from '../errors/CartNotFoundError';

export class GetCart extends UseCase<[string], Cart> {
  constructor(private readonly carts: { findWithItems(id: string): Promise<Cart | null> }) {
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
