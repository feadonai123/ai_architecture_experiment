import { ListStocks } from '../../src/usecases/ListStocks';
import { mockProductRepository } from '../mocks/productRepository';
import { productMock, secondProductMock } from '../data/list-stocks';

function listStocks(
  products = mockProductRepository({ findAll: [productMock, secondProductMock] }),
) {
  return new ListStocks(products);
}

describe('list stocks', () => {
  describe('success', () => {
    it('returns all products with their stocks', async () => {
      const result = await listStocks().run();

      expect(result).toEqual([productMock, secondProductMock]);
    });

    it('returns an empty list when there are no products', async () => {
      await expect(listStocks(mockProductRepository({ findAll: [] })).run()).resolves.toEqual([]);
    });
  });
});
