import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { CartPrefab } from '../../prefabs/cart.prefab';
import { CartItemPrefab } from '../../prefabs/cart-item.prefab';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('GET /cart/:cartId', () => {
  describe('success', () => {
    it('returns an empty cart', async () => {
      const cart = await CartPrefab.create(getTestDataSource());

      const response = await api().get(`/cart/${cart.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: cart.id,
        createdAt: cart.createdAt.toISOString(),
        items: [],
      });
    });

    it('returns a cart with items', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const product = await ProductPrefab.create(ds);
      const item = await CartItemPrefab.create(ds, {
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await api().get(`/cart/${cart.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: cart.id,
        createdAt: cart.createdAt.toISOString(),
        items: [
          {
            id: item.id,
            productId: product.id,
            quantity: 2,
          },
        ],
      });
    });
  });

  describe('errors', () => {
    it('returns CartNotFoundError when the cart does not exist', async () => {
      const response = await api().get(`/cart/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('CartNotFoundError');
      expect(response.body.statusCode).toBe(404);
    });
  });
});
