import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { ProductRepository } from '../ports/ProductRepository';
import { parsePositiveInteger } from '../utils/parser';

export type IncreaseStockInput = { productId: string; quantity: unknown };

export class IncreaseStock extends UseCase<[IncreaseStockInput], Product> {
  constructor(private readonly products: Pick<ProductRepository, 'findById' | 'save'>) {
    super();
  }

  protected async execute(input: IncreaseStockInput): Promise<Product> {
    const quantity = parsePositiveInteger(input.quantity);
    if (quantity === null) {
      throw new InvalidQuantityError(input.quantity);
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    const updated = new Product(
      product.id,
      product.name,
      product.description,
      product.price,
      product.stock + quantity,
      product.deletedAt,
    );
    await this.products.save(updated);
    return updated;
  }
}
