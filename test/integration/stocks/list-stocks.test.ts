import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('GET /stocks', () => {
  describe('success', () => {
    it('lists an empty inventory', async () => {
      const response = await api().get('/stocks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('lists all products ordered by id', async () => {
      const ds = getTestDataSource();
      const first = await ProductPrefab.create(ds, {
        id: '00000000-0000-4000-8000-000000000002',
        stock: 0,
      });
      const second = await ProductPrefab.create(ds, {
        id: '00000000-0000-4000-8000-000000000001',
        stock: 10,
      });

      const response = await api().get('/stocks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: second.id,
          name: second.name,
          description: second.description,
          price: second.price,
          stock: second.stock,
        },
        {
          id: first.id,
          name: first.name,
          description: first.description,
          price: first.price,
          stock: first.stock,
        },
      ]);
    });

    it('does not list deleted products', async () => {
      const ds = getTestDataSource();
      const tea = await ProductPrefab.create(ds, { name: 'Tea', stock: 10 });
      await ProductPrefab.create(ds, { name: 'Gone', stock: 5, deletedAt: new Date() });

      const response = await api().get('/stocks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: tea.id,
          name: tea.name,
          description: tea.description,
          price: tea.price,
          stock: tea.stock,
        },
      ]);
    });
  });
});
