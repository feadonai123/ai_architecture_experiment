import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { DuplicateSlugError } from '../errors/DuplicateSlugError';
import { InvalidNameError } from '../errors/InvalidNameError';
import { InvalidPriceError } from '../errors/InvalidPriceError';
import { InvalidSlugError } from '../errors/InvalidSlugError';
import { ProductRepository } from '../ports/ProductRepository';
import { parseString } from '../utils/parser';

export type CreateProductInput = {
  name: unknown;
  slug: unknown;
  description?: unknown;
  price: unknown;
};

export class CreateProduct extends UseCase<[CreateProductInput], Product> {
  constructor(
    private readonly products: Pick<ProductRepository, 'create' | 'findBySlug'>,
    private readonly createId: () => string,
  ) {
    super();
  }

  protected async execute(input: CreateProductInput): Promise<Product> {
    const name = parseString(input.name);
    if (name === null) {
      throw new InvalidNameError(input.name);
    }
    const slug = parseString(input.slug);
    if (slug === null) {
      throw new InvalidSlugError(input.slug);
    }
    const price =
      typeof input.price === 'number' && Number.isFinite(input.price) && input.price >= 0
        ? input.price
        : null;
    if (price === null) {
      throw new InvalidPriceError(input.price);
    }
    const existing = await this.products.findBySlug(slug);
    if (existing) {
      throw new DuplicateSlugError(slug);
    }
    const description = typeof input.description === 'string' ? input.description : '';
    const product = new Product(this.createId(), name, slug, description, price, 0, null);
    await this.products.create(product);
    return product;
  }
}
