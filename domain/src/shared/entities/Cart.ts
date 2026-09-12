import { CartItem } from './CartItem';

export class Cart {
  constructor(
    public readonly id: string,
    public readonly createdAt: Date,
    public items: CartItem[],
  ) {}
}
