import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { ProductRepository } from '../ports/ProductRepository';
import { parseNonNegativeInteger } from '../utils/parser';

export type UpdateStockInput = { productId: string; quantity: unknown };

export class UpdateStock extends UseCase<[UpdateStockInput], Product> {
  constructor(private readonly products: Pick<ProductRepository, 'findById' | 'save'>) {
    super();
  }

  protected async execute(input: UpdateStockInput): Promise<Product> {
    const quantity = parseNonNegativeInteger(input.quantity);
    if (quantity === null) {
      throw new InvalidQuantityError(input.quantity);
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    const updated = new Product(product.id, product.name, product.price, quantity);
    await this.products.save(updated);
    return updated;
  }
}
