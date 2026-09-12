import { Cart } from '../../src/shared/entities/Cart';

export function mockCartRepository(
  overrides: {
    create?: Cart;
    findById?: Cart | null;
    findWithItems?: Cart | null;
  } = {},
) {
  return {
    create: jest.fn().mockResolvedValue('create' in overrides ? overrides.create : undefined),
    findById: jest.fn().mockResolvedValue('findById' in overrides ? overrides.findById : undefined),
    findWithItems: jest
      .fn()
      .mockResolvedValue('findWithItems' in overrides ? overrides.findWithItems : undefined),
  };
}
