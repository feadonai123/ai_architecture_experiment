import { Product } from '../../src/shared/entities/Product';

export function mockProductRepository(
  overrides: {
    findById?: Product | null;
    findBySlug?: Product | null;
    findAll?: Product[];
    findByFilters?: Product[];
  } = {},
) {
  return {
    findAll: jest.fn().mockResolvedValue('findAll' in overrides ? overrides.findAll : []),
    save: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue(undefined),
    softDelete: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue('findById' in overrides ? overrides.findById : undefined),
    findBySlug: jest
      .fn()
      .mockResolvedValue('findBySlug' in overrides ? overrides.findBySlug : null),
    findByFilters: jest
      .fn()
      .mockResolvedValue('findByFilters' in overrides ? overrides.findByFilters : []),
  };
}
