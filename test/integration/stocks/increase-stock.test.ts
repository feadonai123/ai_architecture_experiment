import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('PATCH /stocks/:productId/increase', () => {
  describe('success', () => {
    it('adds units to the current stock and persists the result', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });
      const path = `/stocks/${product.id}`;

      const response = await api().patch(`${path}/increase`).send({ quantity: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...product, stock: 15 });
      expect((await api().get(path)).body.stock).toBe(15);
    });
  });

  describe('errors', () => {
    it.each([0, -1, 1.5, '5', null, undefined, true])(
      'returns InvalidQuantityError for invalid quantity %p',
      async (quantity) => {
        const productId = uuidv4();

        const response = await api().patch(`/stocks/${productId}/increase`).send({ quantity });

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

      const response = await api().patch(`/stocks/${productId}/increase`).send({ quantity: 1 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'ProductNotFoundError',
        message: `Product not found: ${productId}`,
        statusCode: 404,
      });
    });
  });
});
