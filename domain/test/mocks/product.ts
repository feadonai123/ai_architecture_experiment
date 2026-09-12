import { Product } from '../../src/shared/entities/Product';

export function mockProductRepository(overrides: { findById?: Product | null } = {}) {
  return {
    findById: jest.fn().mockResolvedValue('findById' in overrides ? overrides.findById : undefined),
  };
}
