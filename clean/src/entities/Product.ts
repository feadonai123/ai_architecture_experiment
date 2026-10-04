export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string,
    public readonly price: number,
    public readonly stock: number,
    public readonly deletedAt: Date | null = null,
  ) {}
}
