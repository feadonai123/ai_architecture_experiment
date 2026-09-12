import { Product } from '../../src/entities/Product';
import { ProductRepository } from '../../src/ports/ProductRepository';

export function mockProductRepository(
  overrides: { findById?: Product | null } = {},
): ProductRepository {
  return {
    findById: jest.fn().mockResolvedValue('findById' in overrides ? overrides.findById : undefined),
  };
}
