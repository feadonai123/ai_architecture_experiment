import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { ProductRepository } from '../ports/ProductRepository';

export class DeleteProduct extends UseCase<[string], Product> {
  constructor(private readonly products: Pick<ProductRepository, 'findById' | 'softDelete'>) {
    super();
  }

  protected async execute(productId: string): Promise<Product> {
    const product = await this.products.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }
    const deleted = new Product(
      product.id,
      product.name,
      product.slug,
      product.description,
      product.price,
      product.stock,
      new Date(),
    );
    await this.products.softDelete(deleted);
    return deleted;
  }
}
