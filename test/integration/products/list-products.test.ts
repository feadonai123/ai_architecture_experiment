import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('GET /products', () => {
  describe('success', () => {
    it('returns all products', async () => {
      const ds = getTestDataSource();
      const first = await ProductPrefab.create(ds, {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Coffee',
        price: 20,
        stock: 5,
      });
      const second = await ProductPrefab.create(ds, {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Tea',
        price: 10,
        stock: 10,
      });

      const response = await api().get('/products');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: second.id,
          name: second.name,
          slug: second.slug,
          description: second.description,
          price: second.price,
          stock: second.stock,
        },
        {
          id: first.id,
          name: first.name,
          slug: first.slug,
          description: first.description,
          price: first.price,
          stock: first.stock,
        },
      ]);
    });

    it('returns an empty list when there are no products', async () => {
      const response = await api().get('/products');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('filters by name', async () => {
      const ds = getTestDataSource();
      const tea = await ProductPrefab.create(ds, { name: 'Green Tea', price: 10 });
      await ProductPrefab.create(ds, { name: 'Coffee', price: 20 });

      const response = await api().get('/products').query({ name: 'tea' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: tea.id,
          name: tea.name,
          slug: tea.slug,
          description: tea.description,
          price: tea.price,
          stock: tea.stock,
        },
      ]);
    });

    it('filters by minPrice', async () => {
      const ds = getTestDataSource();
      await ProductPrefab.create(ds, { name: 'Tea', price: 10 });
      const coffee = await ProductPrefab.create(ds, { name: 'Coffee', price: 20 });

      const response = await api().get('/products').query({ minPrice: 15 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: coffee.id,
          name: coffee.name,
          slug: coffee.slug,
          description: coffee.description,
          price: coffee.price,
          stock: coffee.stock,
        },
      ]);
    });

    it('filters by maxPrice', async () => {
      const ds = getTestDataSource();
      const tea = await ProductPrefab.create(ds, { name: 'Tea', price: 10 });
      await ProductPrefab.create(ds, { name: 'Coffee', price: 20 });

      const response = await api().get('/products').query({ maxPrice: 15 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: tea.id,
          name: tea.name,
          slug: tea.slug,
          description: tea.description,
          price: tea.price,
          stock: tea.stock,
        },
      ]);
    });

    it('filters available products', async () => {
      const ds = getTestDataSource();
      const tea = await ProductPrefab.create(ds, { name: 'Tea', stock: 10 });
      await ProductPrefab.create(ds, { name: 'Coffee', stock: 0 });

      const response = await api().get('/products').query({ available: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: tea.id,
          name: tea.name,
          slug: tea.slug,
          description: tea.description,
          price: tea.price,
          stock: tea.stock,
        },
      ]);
    });

    it('filters unavailable products', async () => {
      const ds = getTestDataSource();
      await ProductPrefab.create(ds, { name: 'Tea', stock: 10 });
      const coffee = await ProductPrefab.create(ds, { name: 'Coffee', stock: 0 });

      const response = await api().get('/products').query({ available: false });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: coffee.id,
          name: coffee.name,
          slug: coffee.slug,
          description: coffee.description,
          price: coffee.price,
          stock: coffee.stock,
        },
      ]);
    });

    it('applies combined filters', async () => {
      const ds = getTestDataSource();
      const tea = await ProductPrefab.create(ds, { name: 'Tea', price: 10, stock: 4 });
      await ProductPrefab.create(ds, { name: 'Tea bags', price: 2, stock: 4 });
      await ProductPrefab.create(ds, { name: 'Coffee', price: 10, stock: 0 });

      const response = await api().get('/products').query({
        name: 'tea',
        minPrice: 5,
        maxPrice: 15,
        available: true,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: tea.id,
          name: tea.name,
          slug: tea.slug,
          description: tea.description,
          price: tea.price,
          stock: tea.stock,
        },
      ]);
    });

    it('does not list deleted products', async () => {
      const ds = getTestDataSource();
      const tea = await ProductPrefab.create(ds, { name: 'Tea' });
      await ProductPrefab.create(ds, { name: 'Gone', deletedAt: new Date() });

      const response = await api().get('/products');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: tea.id,
          name: tea.name,
          slug: tea.slug,
          description: tea.description,
          price: tea.price,
          stock: tea.stock,
        },
      ]);
    });
  });

  describe('errors', () => {
    it('returns InvalidPriceError', async () => {
      const response = await api().get('/products').query({ minPrice: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidPriceError');
      expect(response.body.statusCode).toBe(400);
    });

    it('returns InvalidFilterError', async () => {
      const response = await api().get('/products').query({ available: 'maybe' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidFilterError');
      expect(response.body.statusCode).toBe(400);
    });
  });
});
