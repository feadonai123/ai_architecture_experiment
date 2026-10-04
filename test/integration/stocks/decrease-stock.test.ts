import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('PATCH /stocks/:productId/decrease', () => {
  describe('success', () => {
    it('removes the informed quantity from the current stock', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });
      const path = `/stocks/${product.id}`;

      const response = await api().patch(`${path}/decrease`).send({ quantity: 4 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...product, stock: 6 });
      expect((await api().get(path)).body.stock).toBe(6);
    });

    it('allows decreasing the stock to zero', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });
      const path = `/stocks/${product.id}`;

      const response = await api().patch(`${path}/decrease`).send({ quantity: 10 });

      expect(response.status).toBe(200);
      expect(response.body.stock).toBe(0);
      expect((await api().get(path)).body.stock).toBe(0);
    });
  });

  describe('errors', () => {
    it('returns InvalidQuantityError when quantity is 0', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api().patch(`/stocks/${product.id}/decrease`).send({ quantity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidQuantityError');
    });

    it('returns InvalidQuantityError when quantity is not an integer', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api().patch(`/stocks/${product.id}/decrease`).send({ quantity: 1.5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidQuantityError');
    });

    it('returns ProductNotFoundError when the product does not exist', async () => {
      const response = await api().patch(`/stocks/${uuidv4()}/decrease`).send({ quantity: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
      expect(response.body.statusCode).toBe(404);
    });

    it('returns InsufficientStockError when quantity exceeds stock', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 2 });
      const path = `/stocks/${product.id}`;

      const response = await api().patch(`${path}/decrease`).send({ quantity: 5 });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('InsufficientStockError');
      expect(response.body.statusCode).toBe(409);
      expect((await api().get(path)).body.stock).toBe(2);
    });
  });
});
