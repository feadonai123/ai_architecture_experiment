import { CreateCart } from '../../src/usecases/CreateCart';
import { mockCartRepository } from '../mocks/cartRepository';
import { cartMock } from '../data/create-cart';

describe('create cart', () => {
  describe('success', () => {
    it('creates an empty cart', async () => {
      await expect(
        new CreateCart(mockCartRepository({ create: cartMock })).run(),
      ).resolves.toEqual(cartMock);
    });
  });
});
