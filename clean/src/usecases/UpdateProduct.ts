import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { InvalidNameError } from '../errors/InvalidNameError';
import { InvalidPriceError } from '../errors/InvalidPriceError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';
import { ProductRepository } from '../ports/ProductRepository';
import { parseString } from '../utils/parser';

export type UpdateProductInput = {
  productId: string;
  name: unknown;
  description?: unknown;
  price: unknown;
};

export class UpdateProduct extends UseCase<[UpdateProductInput], Product> {
  constructor(private readonly products: Pick<ProductRepository, 'findById' | 'save'>) {
    super();
  }

  protected async execute(input: UpdateProductInput): Promise<Product> {
    const name = parseString(input.name);
    if (name === null) {
      throw new InvalidNameError(input.name);
    }
    const price =
      typeof input.price === 'number' && Number.isFinite(input.price) && input.price >= 0
        ? input.price
        : null;
    if (price === null) {
      throw new InvalidPriceError(input.price);
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    const description = typeof input.description === 'string' ? input.description : '';
    const updated = new Product(
      product.id,
      name,
      description,
      price,
      product.stock,
      product.deletedAt,
    );
    await this.products.save(updated);
    return updated;
  }
}
