import { Product } from '../../src/entities/Product';
import { ProductRepository } from '../../src/ports/ProductRepository';

export function mockProductRepository(
  overrides: {
    findById?: Product | null;
    findAll?: Product[];
    findByFilters?: Product[];
  } = {},
): ProductRepository {
  return {
    findAll: jest.fn().mockResolvedValue('findAll' in overrides ? overrides.findAll : []),
    save: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue(undefined),
    softDelete: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue('findById' in overrides ? overrides.findById : undefined),
    findByFilters: jest
      .fn()
      .mockResolvedValue('findByFilters' in overrides ? overrides.findByFilters : []),
  };
}
