import { CartItemNotFoundError, CartNotFoundError } from '../../src/errors';
import { removeCartItem } from '../../src/routes/removeCartItem';
import { mockCartRepo } from '../mocks/cart';
import { mockCartItemRepo } from '../mocks/cartItem';
import { mockDataSource } from '../mocks/dataSource';
import {
  cartMock,
  itemMock,
  missingCartMock,
  missingProductMock,
  productMock,
} from '../mocks/remove-item';

describe('remove item', () => {
  describe('success', () => {
    it('removes the item', async () => {
      const ds = mockDataSource({
        cart: mockCartRepo({ findOne: cartMock }),
        cartItem: mockCartItemRepo({ find: cartMock.items, findOne: itemMock }),
      });

      const result = await removeCartItem(ds, cartMock.id, productMock.id);
      expect(result.items).toEqual(cartMock.items);
    });
  });

  describe('errors', () => {
    it('throws CartNotFoundError', async () => {
      const ds = mockDataSource({
        cart: mockCartRepo({ findOne: null }),
      });
      await expect(removeCartItem(ds, missingCartMock.id, productMock.id)).rejects.toBeInstanceOf(
        CartNotFoundError,
      );
    });

    it('throws CartItemNotFoundError', async () => {
      const ds = mockDataSource({
        cart: mockCartRepo({ findOne: cartMock }),
        cartItem: mockCartItemRepo({ find: cartMock.items, findOne: null }),
      });
      await expect(removeCartItem(ds, cartMock.id, missingProductMock.id)).rejects.toBeInstanceOf(
        CartItemNotFoundError,
      );
    });
  });
});
