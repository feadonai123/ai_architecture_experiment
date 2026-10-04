import { UseCase } from '../../../shared/base/useCase.base';
import { Product } from '../../../shared/entities/Product';
import { parseNonNegativeNumber, parseOptionalBoolean } from '../../../utils/parser';
import { InvalidFilterError } from '../errors/InvalidFilterError';
import { InvalidPriceError } from '../errors/InvalidPriceError';

export type ListProductsInput = {
  name?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
  available?: unknown;
};

export class ListProducts extends UseCase<[ListProductsInput], Product[]> {
  constructor(
    private readonly products: {
      findByFilters(filters: {
        name?: string;
        minPrice?: number;
        maxPrice?: number;
        available?: boolean;
      }): Promise<Product[]>;
    },
  ) {
    super();
  }

  protected async execute(input: ListProductsInput): Promise<Product[]> {
    const filters: {
      name?: string;
      minPrice?: number;
      maxPrice?: number;
      available?: boolean;
    } = {};

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
