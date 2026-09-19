import { GetStock } from '../../src/usecases/GetStock';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockStocks, stockProductMock } from '../mocks/stocks';
describe('get stock', () => {
  let repo: ReturnType<typeof mockStocks>;
  beforeEach(() => {
    repo = mockStocks();
  });
  describe('success', () => {
    it('returns the expected product data', async () => {
      const result = await new GetStock(repo).run(stockProductMock.id);
      expect(result).toEqual(stockProductMock);
    });
  });
  describe('errors', () => {
    it('throws ProductNotFoundError without saving', async () => {
      repo.findById.mockResolvedValueOnce(null);
      await expect(new GetStock(repo).run('missing')).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
