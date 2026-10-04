import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('PATCH /stocks/:productId/increase', () => {
  describe('success', () => {
    it('adds the informed quantity to the current stock', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 10 });
      const path = `/stocks/${product.id}`;

      const response = await api().patch(`${path}/increase`).send({ quantity: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        stock: 15,
      });
      expect((await api().get(path)).body.stock).toBe(15);
    });
  });

  describe('errors', () => {
    it('returns InvalidQuantityError when quantity is 0', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api().patch(`/stocks/${product.id}/increase`).send({ quantity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidQuantityError');
    });

    it('returns InvalidQuantityError when quantity is not an integer', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api().patch(`/stocks/${product.id}/increase`).send({ quantity: 1.5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidQuantityError');
    });

    it('returns ProductNotFoundError when the product does not exist', async () => {
      const response = await api().patch(`/stocks/${uuidv4()}/increase`).send({ quantity: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
      expect(response.body.statusCode).toBe(404);
    });
  });
});
