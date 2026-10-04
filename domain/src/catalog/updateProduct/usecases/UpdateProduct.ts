import { UseCase } from '../../../shared/base/useCase.base';
import { Product } from '../../../shared/entities/Product';
import { parseString } from '../../../utils/parser';
import { InvalidNameError } from '../errors/InvalidNameError';
import { InvalidPriceError } from '../errors/InvalidPriceError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';

export type UpdateProductInput = {
  productId: string;
  name: unknown;
  description?: unknown;
  price: unknown;
};

export class UpdateProduct extends UseCase<[UpdateProductInput], Product> {
  constructor(
    private readonly products: {
      findById(id: string): Promise<Product | null>;
      save(product: Product): Promise<void>;
    },
  ) {
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
