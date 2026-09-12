import { UseCase } from '../base/useCase.base';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { CartNotFoundError } from '../errors/CartNotFoundError';
import { InsufficientStockError } from '../errors/InsufficientStockError';
import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { CartItemRepository } from '../ports/CartItemRepository';
import { CartRepository } from '../ports/CartRepository';
import { ProductRepository } from '../ports/ProductRepository';
import { parsePositiveInteger } from '../utils/parser';

export type AddCartItemInput = {
  cartId: string;
  productId: string;
  quantity: unknown;
};

export class AddCartItem extends UseCase<[AddCartItemInput], Cart> {
  constructor(
    private readonly products: ProductRepository,
    private readonly carts: CartRepository,
    private readonly cartItems: CartItemRepository,
    private readonly createId: () => string,
  ) {
    super();
  }

  protected async execute(input: AddCartItemInput): Promise<Cart> {
    const quantity = parsePositiveInteger(input.quantity);
    if (quantity === null) {
      throw new InvalidQuantityError(input.quantity);
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    const cart = await this.carts.findById(input.cartId);
    if (!cart) {
      throw new CartNotFoundError(input.cartId);
    }

    const existing = await this.cartItems.findByCartAndProduct(input.cartId, input.productId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > product.stock) {
      throw new InsufficientStockError();
    }

    if (existing) {
      existing.quantity = nextQuantity;
      await this.cartItems.save(existing);
    } else {
      await this.cartItems.save(
        CartItem.create({
          id: this.createId(),
          cartId: input.cartId,
          productId: input.productId,
          quantity,
        }),
      );
    }

    const updated = await this.carts.findWithItems(input.cartId);
    return updated!;
  }
}
