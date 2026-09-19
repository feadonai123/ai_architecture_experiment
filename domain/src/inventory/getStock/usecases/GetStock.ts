import { UseCase } from '../../../shared/base/useCase.base';
import { Product } from '../../../shared/entities/Product';

import { ProductNotFoundError } from '../errors/ProductNotFoundError';

export class GetStock extends UseCase<[string], Product> {
  constructor(private readonly products: { findById(id: string): Promise<Product | null> }) {
    super();
  }
  protected async execute(productId: string): Promise<Product> {
    const product = await this.products.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);

    return product;
  }
}
