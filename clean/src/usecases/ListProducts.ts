import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { InvalidFilterError } from '../errors/InvalidFilterError';
import { InvalidPriceError } from '../errors/InvalidPriceError';
import { ProductFilters, ProductRepository } from '../ports/ProductRepository';
import { parseNonNegativeNumber, parseOptionalBoolean } from '../utils/parser';

export type ListProductsInput = {
  name?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
  available?: unknown;
};

export class ListProducts extends UseCase<[ListProductsInput], Product[]> {
  constructor(private readonly products: Pick<ProductRepository, 'findByFilters'>) {
    super();
  }

  protected async execute(input: ListProductsInput): Promise<Product[]> {
    const filters: ProductFilters = {};

    if (input.name !== undefined && input.name !== '') {
      if (typeof input.name !== 'string') {
        throw new InvalidFilterError(input.name);
      }
      const name = input.name.trim();
      if (name.length > 0) {
        filters.name = name;
      }
    }

    if (input.minPrice !== undefined && input.minPrice !== '') {
      const minPrice = parseNonNegativeNumber(input.minPrice);
      if (minPrice === null) {
        throw new InvalidPriceError(input.minPrice);
      }
      filters.minPrice = minPrice;
    }

    if (input.maxPrice !== undefined && input.maxPrice !== '') {
      const maxPrice = parseNonNegativeNumber(input.maxPrice);
      if (maxPrice === null) {
        throw new InvalidPriceError(input.maxPrice);
      }
      filters.maxPrice = maxPrice;
    }

    if (
      filters.minPrice !== undefined &&
      filters.maxPrice !== undefined &&
      filters.minPrice > filters.maxPrice
    ) {
      throw new InvalidPriceError(`${filters.minPrice}>${filters.maxPrice}`);
    }

    const available = parseOptionalBoolean(input.available);
    if (available === 'invalid') {
      throw new InvalidFilterError(input.available);
    }
    if (available !== undefined) {
      filters.available = available;
    }

    return this.products.findByFilters(filters);
  }
}
