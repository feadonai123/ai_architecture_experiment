import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { CartItemRecord } from '../../persistence/cart-item.record';
import { CartPrefab } from '../../prefabs/cart.prefab';
import { CartItemPrefab } from '../../prefabs/cart-item.prefab';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('DELETE /products/:productId', () => {
  describe('success', () => {
    it('soft-deletes the product', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api().delete(`/products/${product.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        stock: product.stock,
      });

      const later = await api().get(`/products/${product.id}`);
      expect(later.status).toBe(404);
      expect(later.body.error).toBe('ProductNotFoundError');
    });

    it('keeps the cart item in the database but hides it from GET cart', async () => {
      const ds = getTestDataSource();
      const product = await ProductPrefab.create(ds, { stock: 10 });
      const cart = await CartPrefab.create(ds);
      const item = await CartItemPrefab.create(ds, {
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const deleted = await api().delete(`/products/${product.id}`);
      expect(deleted.status).toBe(200);

      const remaining = await ds.getRepository(CartItemRecord).find({ where: { id: item.id } });
      expect(remaining).toHaveLength(1);

      const cartResponse = await api().get(`/cart/${cart.id}`);
      expect(cartResponse.status).toBe(200);
      expect(cartResponse.body.items).toEqual([]);
    });
  });

  describe('errors', () => {
    it('returns ProductNotFoundError when the product does not exist', async () => {
      const response = await api().delete(`/products/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
      expect(response.body.statusCode).toBe(404);
    });
  });
});
