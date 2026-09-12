import { Cart } from '../entities/Cart';
import { CartRepository } from '../ports/CartRepository';

export class CreateCart {
  constructor(private readonly carts: CartRepository) {}

  execute(): Promise<Cart> {
    return this.carts.create();
  }
}
