import { UseCase } from '../base/useCase.base';
import { Cart } from '../entities/Cart';
import { CartRepository } from '../ports/CartRepository';

export class CreateCart extends UseCase<[], Cart> {
  constructor(private readonly carts: CartRepository) {
    super();
  }

  protected execute(): Promise<Cart> {
    return this.carts.create();
  }
}
