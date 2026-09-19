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
      expect(response.body).toEqual([second, first]);
    });
  });
});
