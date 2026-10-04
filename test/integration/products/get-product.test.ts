import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('GET /products/:productId', () => {
  describe('success', () => {
    it('returns the requested product', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });

      const response = await api().get(`/products/${product.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
      });
    });
  });

  describe('errors', () => {
    it('returns ProductNotFoundError', async () => {
      const response = await api().get(`/products/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
      expect(response.body.statusCode).toBe(404);
    });

    it('returns ProductNotFoundError when the product is deleted', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), {
        deletedAt: new Date(),
      });

      const response = await api().get(`/products/${product.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
    });
  });
});
