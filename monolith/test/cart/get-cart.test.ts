import { CartNotFoundError } from '../../src/errors';
import { getCart } from '../../src/routes/getCart';
import { mockCartRepo } from '../mocks/cart';
import { mockCartItemRepo } from '../mocks/cartItem';
import { mockDataSource } from '../mocks/dataSource';
import { cartMock, cartWithItemsMock, missingCartMock, productMock } from '../mocks/get-cart';
import { mockProductRepo } from '../mocks/product';

describe('get cart', () => {
  describe('success', () => {
    it('returns an empty cart', async () => {
      const ds = mockDataSource({
        cart: mockCartRepo({ findOne: cartMock }),
        cartItem: mockCartItemRepo({ find: cartMock.items }),
      });

      await expect(getCart(ds, cartMock.id)).resolves.toMatchObject({
        id: cartMock.id,
        items: cartMock.items,
      });
    });

    it('returns a cart with items', async () => {
      const ds = mockDataSource({
        cart: mockCartRepo({ findOne: cartWithItemsMock }),
        cartItem: mockCartItemRepo({ find: cartWithItemsMock.items }),
        product: mockProductRepo({ find: [productMock] }),
      });

      await expect(getCart(ds, cartWithItemsMock.id)).resolves.toMatchObject({
        id: cartWithItemsMock.id,
        items: cartWithItemsMock.items,
      });
    });
  });

  describe('errors', () => {
    it('throws CartNotFoundError', async () => {
      const ds = mockDataSource({
        cart: mockCartRepo({ findOne: null }),
      });
      await expect(getCart(ds, missingCartMock.id)).rejects.toBeInstanceOf(CartNotFoundError);
    });
  });
});
