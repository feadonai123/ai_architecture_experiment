import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('PUT /stocks/:productId', () => {
  describe('success', () => {
    it('sets and persists the absolute stock quantity', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });
      const path = `/stocks/${product.id}`;

      const response = await api().put(path).send({ quantity: 25 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...product, stock: 25 });
      expect((await api().get(path)).body.stock).toBe(25);
    });

    it('allows setting stock to zero', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });

      const response = await api().put(`/stocks/${product.id}`).send({ quantity: 0 });

      expect(response.status).toBe(200);
      expect(response.body.stock).toBe(0);
    });
  });

  describe('errors', () => {
    it.each([-1, 1.5, '5', null, undefined, true])(
      'returns InvalidQuantityError for invalid quantity %p',
      async (quantity) => {
        const productId = uuidv4();

        const response = await api().put(`/stocks/${productId}`).send({ quantity });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: 'InvalidQuantityError',
          message: `Invalid quantity: ${String(quantity)}`,
          statusCode: 400,
        });
      },
    );

    it('returns ProductNotFoundError when the product does not exist', async () => {
      const productId = uuidv4();

      const response = await api().put(`/stocks/${productId}`).send({ quantity: 1 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'ProductNotFoundError',
        message: `Product not found: ${productId}`,
        statusCode: 404,
      });
    });
  });
});
