export class OrderItem {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly unitPrice: number,
  ) {}
}
