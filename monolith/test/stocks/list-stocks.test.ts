import { listStocks } from '../../src/routes/listStocks';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { productMock, secondProductMock } from '../mocks/list-stocks';

describe('list stocks', () => {
  describe('success', () => {
    it('returns all products with their stocks', async () => {
      const products = [productMock, secondProductMock];
      const ds = mockDataSource({ product: mockProductRepo({ find: products }) });

      await expect(listStocks(ds)).resolves.toEqual(products);
    });

    it('returns an empty list when there are no products', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ find: [] }) });

      await expect(listStocks(ds)).resolves.toEqual([]);
    });
  });
});
