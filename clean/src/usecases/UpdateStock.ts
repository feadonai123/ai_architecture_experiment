import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { ProductRepository } from '../ports/ProductRepository';
import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
export type UpdateStockInput = { productId: string; quantity: unknown };
export class UpdateStock extends UseCase<[UpdateStockInput], Product> {
  constructor(private readonly products: Pick<ProductRepository, 'findById' | 'save'>) {
    super();
  }
  protected async execute(input: UpdateStockInput): Promise<Product> {
    if (
      typeof input.quantity !== 'number' ||
      !Number.isInteger(input.quantity) ||
      input.quantity < 0
    ) {
      throw new InvalidQuantityError(input.quantity);
    }
    const product = await this.products.findById(input.productId);
    if (!product) throw new ProductNotFoundError(input.productId);

    const updated = new Product(product.id, product.name, product.price, input.quantity);
    await this.products.save(updated);
    return updated;
  }
}
