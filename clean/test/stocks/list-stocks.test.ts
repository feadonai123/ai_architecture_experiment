import { ListStocks } from '../../src/usecases/ListStocks';

import { mockStocks, stockProductMock } from '../mocks/stocks';
describe('list stocks', () => {
  let repo: ReturnType<typeof mockStocks>;
  beforeEach(() => {
    repo = mockStocks();
  });
  describe('success', () => {
    it('returns the expected product data', async () => {
      const result = await new ListStocks(repo).run();
      expect(result).toEqual([stockProductMock]);
    });
    it('returns an empty list when no products exist', async () => {
      repo.findAll.mockResolvedValueOnce([]);
      await expect(new ListStocks(repo).run()).resolves.toEqual([]);
    });
  });
});
