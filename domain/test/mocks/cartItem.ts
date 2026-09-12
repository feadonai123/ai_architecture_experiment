import { CartItem } from '../../src/shared/entities/CartItem';

export function mockCartItemRepository(
  overrides: {
    findByCartAndProduct?: CartItem | null;
    save?: jest.Mock;
    remove?: jest.Mock;
  } = {},
) {
  return {
    findByCartAndProduct: jest
      .fn()
      .mockResolvedValue(
        'findByCartAndProduct' in overrides ? overrides.findByCartAndProduct : null,
      ),
    save: overrides.save ?? jest.fn(),
    remove: overrides.remove ?? jest.fn(),
  };
}
