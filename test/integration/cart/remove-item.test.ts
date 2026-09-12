import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { CartPrefab } from '../../prefabs/cart.prefab';
import { CartItemPrefab } from '../../prefabs/cart-item.prefab';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('DELETE /cart/items/:productId', () => {
  describe('success', () => {
    it('removes the cart item', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const keepProduct = await ProductPrefab.create(ds, { name: 'Keep' });
      const removeProduct = await ProductPrefab.create(ds, { name: 'Remove' });
      await CartItemPrefab.create(ds, {
        cartId: cart.id,
        productId: keepProduct.id,
        quantity: 1,
      });
      await CartItemPrefab.create(ds, {
        cartId: cart.id,
        productId: removeProduct.id,
        quantity: 2,
      });

      const response = await api()
        .delete(`/cart/items/${removeProduct.id}`)
        .query({ cartId: cart.id });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(cart.id);
      expect(response.body.items).toEqual([
        {
          id: expect.any(String),
          productId: keepProduct.id,
          quantity: 1,
        },
      ]);
    });
  });

  describe('errors', () => {
    it('returns CartNotFoundError when the cart does not exist', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api()
        .delete(`/cart/items/${product.id}`)
        .query({ cartId: uuidv4() });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('CartNotFoundError');
    });

    it('returns CartItemNotFoundError when the item does not exist', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const product = await ProductPrefab.create(ds);

      const response = await api()
        .delete(`/cart/items/${product.id}`)
        .query({ cartId: cart.id });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('CartItemNotFoundError');
    });
  });
});
