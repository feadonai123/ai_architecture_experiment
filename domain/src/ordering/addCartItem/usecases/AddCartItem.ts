import { Cart } from '../../../shared/entities/Cart';
import { CartItem } from '../../../shared/entities/CartItem';
import { Product } from '../../../shared/entities/Product';
import { CartNotFoundError } from '../errors/CartNotFoundError';
import { InsufficientStockError } from '../errors/InsufficientStockError';
import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';

export type AddCartItemInput = {
  cartId: string;
  productId: string;
  quantity: unknown;
};

export class AddCartItem {
  constructor(
    private readonly products: { findById(id: string): Promise<Product | null> },
    private readonly carts: {
      findById(id: string): Promise<Cart | null>;
      findWithItems(id: string): Promise<Cart | null>;
    },
    private readonly cartItems: {
      findByCartAndProduct(cartId: string, productId: string): Promise<CartItem | null>;
      save(item: CartItem): Promise<void>;
    },
    private readonly createId: () => string,
  ) {}

  async execute(input: AddCartItemInput): Promise<Cart> {
    if (
      typeof input.quantity !== 'number' ||
      !Number.isInteger(input.quantity) ||
      input.quantity <= 0
    ) {
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
    const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
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
          quantity: input.quantity,
        }),
      );
    }

    const updated = await this.carts.findWithItems(input.cartId);
    return updated!;
  }
}
