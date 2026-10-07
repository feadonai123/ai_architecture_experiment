import { CartNotFoundError } from '../../src/errors/CartNotFoundError';
import { GetCart } from '../../src/usecases/GetCart';
import { mockCartRepository } from '../mocks/cartRepository';
import { cartMock, cartWithItemsMock, missingCartMock } from '../data/get-cart';

describe('get cart', () => {
  describe('success', () => {
    it('returns an empty cart', async () => {
      await expect(
        new GetCart(mockCartRepository({ findWithItems: cartMock })).run(cartMock.id),
      ).resolves.toMatchObject({ id: cartMock.id, items: cartMock.items });
    });

    it('returns a cart with items', async () => {
      await expect(
        new GetCart(mockCartRepository({ findWithItems: cartWithItemsMock })).run(
          cartWithItemsMock.id,
        ),
      ).resolves.toMatchObject({ id: cartWithItemsMock.id, items: cartWithItemsMock.items });
    });
  });

  describe('errors', () => {
    it('throws CartNotFoundError', async () => {
      await expect(
        new GetCart(mockCartRepository({ findWithItems: null })).run(missingCartMock.id),
      ).rejects.toBeInstanceOf(CartNotFoundError);
    });
  });
});
