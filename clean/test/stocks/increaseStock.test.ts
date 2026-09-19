import { IncreaseStock } from '../../src/usecases/IncreaseStock';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockStocks, stockProductMock } from '../mocks/stocks';
describe('increase stock', () => {
  let repo: ReturnType<typeof mockStocks>;
  beforeEach(() => {
    repo = mockStocks();
  });
  describe('success', () => {
    it('returns the expected product data', async () => {
      const result = await new IncreaseStock(repo).run({
        productId: stockProductMock.id,
        quantity: 4,
      });
      expect(result).toEqual({ ...stockProductMock, stock: 14 });
      expect(repo.save).toHaveBeenCalledWith(result);
    });
  });
  describe('errors', () => {
    it('throws ProductNotFoundError without saving', async () => {
      repo.findById.mockResolvedValueOnce(null);
      await expect(
        new IncreaseStock(repo).run({ productId: 'missing', quantity: 1 }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(repo.save).not.toHaveBeenCalled();
    });
    it.each([0, -1, 1.5, '5', null, undefined, true, NaN, Infinity])(
      'rejects invalid quantity %p before reading persistence',
      async (quantity) => {
        await expect(
          new IncreaseStock(repo).run({ productId: stockProductMock.id, quantity }),
        ).rejects.toBeInstanceOf(InvalidQuantityError);
        expect(repo.findById).not.toHaveBeenCalled();
        expect(repo.save).not.toHaveBeenCalled();
      },
    );
  });
});
