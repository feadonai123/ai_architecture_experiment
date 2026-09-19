import { getStock } from '../../src/controllers/stock/routes/getStock.route';
import { setDataSource } from '../../src/database';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockStocks, stockProductMock, mockStockDataSource } from '../mocks/stocks';
describe('get stock', () => {
  let repo: ReturnType<typeof mockStocks>;
  beforeEach(() => {
    repo = mockStocks();
    setDataSource(mockStockDataSource(repo));
  });
  describe('success', () => {
    it('returns the expected product data', async () => {
      const result = await getStock(stockProductMock.id);
      expect(result).toEqual(stockProductMock);
    });
  });
  describe('errors', () => {
    it('throws ProductNotFoundError without saving', async () => {
      repo.findById.mockResolvedValueOnce(null);
      await expect(getStock('missing')).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
