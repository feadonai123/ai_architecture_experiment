import { UseCase } from '../../../shared/base/useCase.base';
import { Product } from '../../../shared/entities/Product';
import { parsePositiveInteger } from '../../../utils/parser';
import { InvalidQuantityError } from '../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../errors/ProductNotFoundError';

export type IncreaseStockInput = { productId: string; quantity: unknown };

export class IncreaseStock extends UseCase<[IncreaseStockInput], Product> {
  constructor(
    private readonly products: {
      findById(id: string): Promise<Product | null>;
      save(product: Product): Promise<void>;
    },
  ) {
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
