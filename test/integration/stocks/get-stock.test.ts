import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('GET /stocks/:productId', () => {
  describe('success', () => {
    it('returns the requested product with its stock', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });

      const response = await api().get(`/stocks/${product.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        stock: product.stock,
      });
    });
  });

  describe('errors', () => {
    it('returns ProductNotFoundError when the product does not exist', async () => {
      const response = await api().get(`/stocks/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
      expect(response.body.statusCode).toBe(404);
    });

    it('returns ProductNotFoundError when the product is deleted', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), {
        deletedAt: new Date(),
      });

      const response = await api().get(`/stocks/${product.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
    });
  });
});
