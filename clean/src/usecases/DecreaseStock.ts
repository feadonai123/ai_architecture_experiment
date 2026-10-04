import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { InsufficientStockError } from '../errors/InsufficientStockError';
import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { ProductRepository } from '../ports/ProductRepository';
import { parsePositiveInteger } from '../utils/parser';

export type DecreaseStockInput = { productId: string; quantity: unknown };

export class DecreaseStock extends UseCase<[DecreaseStockInput], Product> {
  constructor(private readonly products: Pick<ProductRepository, 'findById' | 'save'>) {
    super();
  }

  protected async execute(input: DecreaseStockInput): Promise<Product> {
    const quantity = parsePositiveInteger(input.quantity);
    if (quantity === null) {
      throw new InvalidQuantityError(input.quantity);
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }
    if (quantity > product.stock) {
      throw new InsufficientStockError();
    }

    const updated = new Product(
      product.id,
      product.name,
      product.slug,
      product.description,
      product.price,
      product.stock - quantity,
      product.deletedAt,
    );
    await this.products.save(updated);
    return updated;
  }
}
