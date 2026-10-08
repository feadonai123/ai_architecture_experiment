import { CartItemNotFoundError } from '../../src/errors/CartItemNotFoundError';
import { CartNotFoundError } from '../../src/errors/CartNotFoundError';
import { RemoveCartItem } from '../../src/usecases/RemoveCartItem';
import { mockCartRepository } from '../mocks/cartRepository';
import { mockCartItemRepository } from '../mocks/cartItemRepository';
import {
  cartMock,
  emptyCartMock,
  itemMock,
  missingCartMock,
  missingProductMock,
  productMock,
} from '../data/remove-item';

describe('remove item', () => {
  describe('success', () => {
    it('removes the item', async () => {
      const result = await new RemoveCartItem(
        mockCartRepository({ findById: cartMock, findWithItems: emptyCartMock }),
        mockCartItemRepository({ findByCartAndProduct: itemMock }),
      ).run(cartMock.id, productMock.id);

      expect(result.items).toEqual(emptyCartMock.items);
    });
  });

  describe('errors', () => {
    it('throws CartNotFoundError', async () => {
      await expect(
        new RemoveCartItem(
          mockCartRepository({ findById: null }),
          mockCartItemRepository(),
        ).run(missingCartMock.id, productMock.id),
      ).rejects.toBeInstanceOf(CartNotFoundError);
    });

    it('throws CartItemNotFoundError', async () => {
      await expect(
        new RemoveCartItem(
          mockCartRepository({ findById: cartMock }),
          mockCartItemRepository(),
        ).run(cartMock.id, missingProductMock.id),
      ).rejects.toBeInstanceOf(CartItemNotFoundError);
    });
  });
});
