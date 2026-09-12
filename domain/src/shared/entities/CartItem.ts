export class CartItem {
  constructor(
    public readonly id: string,
    public readonly cartId: string,
    public readonly productId: string,
    public quantity: number,
  ) {}

  static create(input: {
    id: string;
    cartId: string;
    productId: string;
    quantity: number;
  }): CartItem {
    return new CartItem(input.id, input.cartId, input.productId, input.quantity);
  }
}
