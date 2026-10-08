import { CartItem } from '../../src/entities/CartItem';
import { CartItemRepository } from '../../src/ports/CartItemRepository';

export function mockCartItemRepository(
  overrides: {
    findByCartAndProduct?: CartItem | null;
    save?: jest.Mock;
    remove?: jest.Mock;
  } = {},
): CartItemRepository {
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
