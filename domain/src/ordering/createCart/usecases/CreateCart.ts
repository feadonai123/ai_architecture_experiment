import { Cart } from '../../../shared/entities/Cart';

export class CreateCart {
  constructor(private readonly carts: { create(): Promise<Cart> }) {}

  execute(): Promise<Cart> {
    return this.carts.create();
  }
}
