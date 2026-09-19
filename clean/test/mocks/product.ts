import { Product } from '../../src/entities/Product';
import { ProductRepository } from '../../src/ports/ProductRepository';

export function mockProductRepository(
  overrides: { findById?: Product | null } = {},
): ProductRepository {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue('findById' in overrides ? overrides.findById : undefined),
  };
}
