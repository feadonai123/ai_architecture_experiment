import { createCart } from '../../src/routes/createCart';
import { mockCartRepo } from '../mocks/cart';
import { cartMock } from '../mocks/create-cart';
import { mockDataSource } from '../mocks/dataSource';

describe('create cart', () => {
  describe('success', () => {
    it('creates an empty cart', async () => {
      const ds = mockDataSource({
        cart: mockCartRepo({ save: cartMock }),
      });

      await expect(createCart(ds)).resolves.toEqual(cartMock);
    });
  });
});
