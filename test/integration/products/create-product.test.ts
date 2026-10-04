import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('POST /products', () => {
  describe('success', () => {
    it('creates a product with stock 0', async () => {
      const response = await api().post('/products').send({
        name: 'Tea',
        slug: 'tea',
        description: 'Green leaves',
        price: 10,
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Tea');
      expect(response.body.slug).toBe('tea');
      expect(response.body.description).toBe('Green leaves');
      expect(response.body.price).toBe(10);
      expect(response.body.stock).toBe(0);
      expect(response.body.id).toEqual(expect.any(String));
    });

    it('allows two products with the same name and different slugs', async () => {
      await api().post('/products').send({ name: 'Tea', slug: 'tea', price: 10 });

      const response = await api()
        .post('/products')
        .send({ name: 'Tea', slug: 'green-tea', price: 12 });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Tea');
      expect(response.body.slug).toBe('green-tea');
    });
  });

  describe('errors', () => {
    it('returns InvalidNameError', async () => {
      const response = await api().post('/products').send({ name: '  ', slug: 'tea', price: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidNameError');
      expect(response.body.statusCode).toBe(400);
    });

    it('returns InvalidSlugError', async () => {
      const response = await api().post('/products').send({ name: 'Tea', slug: '  ', price: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidSlugError');
      expect(response.body.statusCode).toBe(400);
    });

    it('returns InvalidPriceError', async () => {
      const response = await api().post('/products').send({ name: 'Tea', slug: 'tea', price: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidPriceError');
      expect(response.body.statusCode).toBe(400);
    });

    it('returns DuplicateSlugError', async () => {
      await ProductPrefab.create(getTestDataSource(), { name: 'Tea', slug: 'tea' });

      const response = await api()
        .post('/products')
        .send({ name: 'Other Tea', slug: 'tea', price: 10 });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('DuplicateSlugError');
      expect(response.body.statusCode).toBe(409);
    });
  });
});
