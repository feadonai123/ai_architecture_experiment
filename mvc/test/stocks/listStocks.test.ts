import { listStocks } from '../../src/controllers/stock/routes/listStocks.route';
import { setDataSource } from '../../src/database';

import { mockStocks, stockProductMock, mockStockDataSource } from '../mocks/stocks';
describe('list stocks', () => {
  let repo: ReturnType<typeof mockStocks>;
  beforeEach(() => {
    repo = mockStocks();
    setDataSource(mockStockDataSource(repo));
  });
  describe('success', () => {
    it('returns the expected product data', async () => {
      const result = await listStocks();
      expect(result).toEqual([stockProductMock]);
    });
    it('returns an empty list when no products exist', async () => {
      repo.findAll.mockResolvedValueOnce([]);
      await expect(listStocks()).resolves.toEqual([]);
    });
  });
});
