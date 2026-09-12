import { CreateCart } from '../../src/ordering/createCart/usecases/CreateCart';
import { mockCartRepository } from '../mocks/cart';
import { cartMock } from '../mocks/create-cart';

describe('create cart', () => {
  describe('success', () => {
    it('creates an empty cart', async () => {
      await expect(
        new CreateCart(mockCartRepository({ create: cartMock })).execute(),
      ).resolves.toEqual(cartMock);
    });
  });
});
