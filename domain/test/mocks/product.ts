import { Product } from '../../src/shared/entities/Product';

export function mockProductRepository(
  overrides: {
    findById?: Product | null;
    findAll?: Product[];
  } = {},
) {
  return {
    findAll: jest.fn().mockResolvedValue('findAll' in overrides ? overrides.findAll : []),
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue('findById' in overrides ? overrides.findById : undefined),
  };
}
