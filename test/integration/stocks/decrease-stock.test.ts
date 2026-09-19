import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('PATCH /stocks/:productId/decrease', () => {
  describe('success', () => {
    it('removes units and allows decreasing stock to zero', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });
      const path = `/stocks/${product.id}`;

      const response = await api().patch(`${path}/decrease`).send({ quantity: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...product, stock: 0 });
      expect((await api().get(path)).body.stock).toBe(0);
    });
  });

  describe('errors', () => {
    it.each([0, -1, 1.5, '5', null, undefined, true])(
      'returns InvalidQuantityError for invalid quantity %p',
      async (quantity) => {
        const productId = uuidv4();

        const response = await api().patch(`/stocks/${productId}/decrease`).send({ quantity });

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

      const response = await api().patch(`/stocks/${productId}/decrease`).send({ quantity: 1 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'ProductNotFoundError',
        message: `Product not found: ${productId}`,
        statusCode: 404,
      });
    });

    it('returns InsufficientStockError and leaves stock unchanged', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 2 });
      const path = `/stocks/${product.id}`;

      const response = await api().patch(`${path}/decrease`).send({ quantity: 3 });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'InsufficientStockError',
        message: 'Insufficient stock for the requested quantity',
        statusCode: 409,
      });
      expect((await api().get(path)).body.stock).toBe(2);
    });
  });
});
