import { CartItemNotFoundError } from '../../src/ordering/removeCartItem/errors/CartItemNotFoundError';
import { CartNotFoundError } from '../../src/ordering/removeCartItem/errors/CartNotFoundError';
import { RemoveCartItem } from '../../src/ordering/removeCartItem/usecases/RemoveCartItem';
import { mockCartRepository } from '../mocks/cart';
import { mockCartItemRepository } from '../mocks/cartItem';
import {
  cartMock,
  emptyCartMock,
  itemMock,
  missingCartMock,
  missingProductMock,
  productMock,
} from '../mocks/remove-item';

describe('remove item', () => {
  describe('success', () => {
    it('removes the item', async () => {
      const result = await new RemoveCartItem(
        mockCartRepository({ findById: cartMock, findWithItems: emptyCartMock }),
        mockCartItemRepository({ findByCartAndProduct: itemMock }),
      ).execute(cartMock.id, productMock.id);

      expect(result.items).toEqual(emptyCartMock.items);
    });
  });

  describe('errors', () => {
    it('throws CartNotFoundError', async () => {
      await expect(
        new RemoveCartItem(
          mockCartRepository({ findById: null }),
          mockCartItemRepository(),
        ).execute(missingCartMock.id, productMock.id),
      ).rejects.toBeInstanceOf(CartNotFoundError);
    });

    it('throws CartItemNotFoundError', async () => {
      await expect(
        new RemoveCartItem(
          mockCartRepository({ findById: cartMock }),
          mockCartItemRepository(),
        ).execute(cartMock.id, missingProductMock.id),
      ).rejects.toBeInstanceOf(CartItemNotFoundError);
    });
  });
});
