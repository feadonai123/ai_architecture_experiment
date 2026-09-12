import { UseCase } from '../../../shared/base/useCase.base';
import { Cart } from '../../../shared/entities/Cart';

export class CreateCart extends UseCase<[], Cart> {
  constructor(private readonly carts: { create(): Promise<Cart> }) {
    super();
  }

  protected execute(): Promise<Cart> {
    return this.carts.create();
  }
}
