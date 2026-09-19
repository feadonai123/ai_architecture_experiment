import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { ProductRepository } from '../ports/ProductRepository';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';

export class GetStock extends UseCase<[string], Product> {
  constructor(private readonly products: Pick<ProductRepository, 'findById'>) {
    super();
  }
  protected async execute(productId: string): Promise<Product> {
    const product = await this.products.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);

    return product;
  }
}
