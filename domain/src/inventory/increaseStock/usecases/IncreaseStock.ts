import { UseCase } from '../../../shared/base/useCase.base';
import { Product } from '../../../shared/entities/Product';

import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
export type IncreaseStockInput = { productId: string; quantity: unknown };
export class IncreaseStock extends UseCase<[IncreaseStockInput], Product> {
  constructor(
    private readonly products: {
      findById(id: string): Promise<Product | null>;
      save(product: Product): Promise<void>;
    },
  ) {
    super();
  }
  protected async execute(input: IncreaseStockInput): Promise<Product> {
    if (
      typeof input.quantity !== 'number' ||
      !Number.isInteger(input.quantity) ||
      input.quantity <= 0
    ) {
      throw new InvalidQuantityError(input.quantity);
    }
    const product = await this.products.findById(input.productId);
    if (!product) throw new ProductNotFoundError(input.productId);

    const updated = new Product(
      product.id,
      product.name,
      product.price,
      product.stock + input.quantity,
    );
    await this.products.save(updated);
    return updated;
  }
}
