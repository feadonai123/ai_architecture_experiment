import { Product } from '../../src/entities/Product';
import { ProductRepository } from '../../src/ports/ProductRepository';

export function mockProductRepository(
  overrides: {
    findById?: Product | null;
    findAll?: Product[];
  } = {},
): ProductRepository {
  return {
    findAll: jest.fn().mockResolvedValue('findAll' in overrides ? overrides.findAll : []),
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue('findById' in overrides ? overrides.findById : undefined),
  };
}
