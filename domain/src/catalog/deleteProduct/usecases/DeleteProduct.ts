import { UseCase } from '../../../shared/base/useCase.base';
import { Product } from '../../../shared/entities/Product';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';

export class DeleteProduct extends UseCase<[string], Product> {
  constructor(
    private readonly products: {
      findById(id: string): Promise<Product | null>;
      softDelete(product: Product): Promise<void>;
    },
  ) {
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
      product.description,
      product.price,
      product.stock,
      new Date(),
    );
    await this.products.softDelete(deleted);
    return deleted;
  }
}
