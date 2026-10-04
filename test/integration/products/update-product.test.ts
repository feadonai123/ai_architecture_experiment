import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('PUT /products/:productId', () => {
  describe('success', () => {
    it('updates name, slug, description and price', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), {
        name: 'Tea',
        slug: 'tea',
        description: '',
        price: 10,
        stock: 8,
      });

      const response = await api().put(`/products/${product.id}`).send({
        name: 'Green Tea',
        slug: 'green-tea',
        description: 'Leaf',
        price: 12,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: product.id,
        name: 'Green Tea',
        slug: 'green-tea',
        description: 'Leaf',
        price: 12,
        stock: product.stock,
      });
    });

    it('does not change stock', async () => {
      const product = await ProductPrefab.create(getTestDataSource(), { stock: 8, slug: 'tea' });

      const response = await api().put(`/products/${product.id}`).send({
        name: 'Green Tea',
        slug: 'green-tea',
        description: 'Leaf',
        price: 12,
      });

      expect(response.status).toBe(200);
      expect(response.body.stock).toBe(8);
    });
  });

  describe('errors', () => {
    it('returns ProductNotFoundError', async () => {
      const response = await api().put(`/products/${uuidv4()}`).send({
        name: 'Tea',
        slug: 'tea',
        price: 10,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
      expect(response.body.statusCode).toBe(404);
    });

    it('returns InvalidNameError', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api()
        .put(`/products/${product.id}`)
        .send({ name: '', slug: 'tea', price: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidNameError');
    });

    it('returns InvalidSlugError', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api()
        .put(`/products/${product.id}`)
        .send({ name: 'Tea', slug: '', price: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidSlugError');
    });

    it('returns InvalidPriceError', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api()
        .put(`/products/${product.id}`)
        .send({ name: 'Tea', slug: 'tea', price: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidPriceError');
    });

    it('returns DuplicateSlugError', async () => {
      const ds = getTestDataSource();
      await ProductPrefab.create(ds, { name: 'Coffee', slug: 'coffee' });
      const product = await ProductPrefab.create(ds, { name: 'Tea', slug: 'tea' });

      const response = await api().put(`/products/${product.id}`).send({
        name: 'Tea',
        slug: 'coffee',
        price: 10,
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('DuplicateSlugError');
      expect(response.body.statusCode).toBe(409);
    });
  });
});
