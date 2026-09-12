import { UseCase } from '../base/useCase.base';
import { Cart } from '../entities/Cart';
import { CartItemNotFoundError } from '../errors/CartItemNotFoundError';
import { CartNotFoundError } from '../errors/CartNotFoundError';
import { CartItemRepository } from '../ports/CartItemRepository';
import { CartRepository } from '../ports/CartRepository';

export class RemoveCartItem extends UseCase<[string, string], Cart> {
  constructor(
    private readonly carts: CartRepository,
    private readonly cartItems: CartItemRepository,
  ) {
    super();
  }

  protected async execute(cartId: string, productId: string): Promise<Cart> {
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
