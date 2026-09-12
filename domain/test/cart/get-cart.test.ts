import { CartNotFoundError } from '../../src/ordering/getCart/errors/CartNotFoundError';
import { GetCart } from '../../src/ordering/getCart/usecases/GetCart';
import { mockCartRepository } from '../mocks/cart';
import { cartMock, cartWithItemsMock, missingCartMock } from '../mocks/get-cart';

describe('get cart', () => {
  describe('success', () => {
    it('returns an empty cart', async () => {
      await expect(
        new GetCart(mockCartRepository({ findWithItems: cartMock })).execute(cartMock.id),
      ).resolves.toMatchObject({ id: cartMock.id, items: cartMock.items });
    });

    it('returns a cart with items', async () => {
      await expect(
        new GetCart(mockCartRepository({ findWithItems: cartWithItemsMock })).execute(
          cartWithItemsMock.id,
        ),
      ).resolves.toMatchObject({ id: cartWithItemsMock.id, items: cartWithItemsMock.items });
    });
  });

  describe('errors', () => {
    it('throws CartNotFoundError', async () => {
      await expect(
        new GetCart(mockCartRepository({ findWithItems: null })).execute(missingCartMock.id),
      ).rejects.toBeInstanceOf(CartNotFoundError);
    });
  });
});
