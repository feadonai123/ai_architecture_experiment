import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('PUT /stocks/:productId', () => {
  describe('success', () => {
    it('sets the product stock to the informed quantity', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });
      const path = `/stocks/${product.id}`;

      const response = await api().put(path).send({ quantity: 25 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: 25,
      });
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
    it('returns InvalidQuantityError when quantity is negative', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api().put(`/stocks/${product.id}`).send({ quantity: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidQuantityError');
    });

    it('returns InvalidQuantityError when quantity is not an integer', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api().put(`/stocks/${product.id}`).send({ quantity: 1.5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidQuantityError');
    });

    it('returns ProductNotFoundError when the product does not exist', async () => {
      const response = await api().put(`/stocks/${uuidv4()}`).send({ quantity: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
      expect(response.body.statusCode).toBe(404);
    });
  });
});
