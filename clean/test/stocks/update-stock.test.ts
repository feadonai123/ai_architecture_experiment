import { UpdateStock } from '../../src/usecases/UpdateStock';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockStocks, stockProductMock } from '../mocks/stocks';
describe('update stock', () => {
  let repo: ReturnType<typeof mockStocks>;
  beforeEach(() => {
    repo = mockStocks();
  });
  describe('success', () => {
    it('returns the expected product data', async () => {
      const result = await new UpdateStock(repo).run({
        productId: stockProductMock.id,
        quantity: 4,
      });
      expect(result).toEqual({ ...stockProductMock, stock: 4 });
      expect(repo.save).toHaveBeenCalledWith(result);
    });

    it('allows the resulting stock to be zero', async () => {
      await expect(
        new UpdateStock(repo).run({ productId: stockProductMock.id, quantity: 0 }),
      ).resolves.toEqual({ ...stockProductMock, stock: 0 });
    });
  });
  describe('errors', () => {
    it('throws ProductNotFoundError without saving', async () => {
      repo.findById.mockResolvedValueOnce(null);
      await expect(
        new UpdateStock(repo).run({ productId: 'missing', quantity: 1 }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(repo.save).not.toHaveBeenCalled();
    });
    it.each([-1, 1.5, '5', null, undefined, true, NaN, Infinity])(
      'rejects invalid quantity %p before reading persistence',
      async (quantity) => {
        await expect(
          new UpdateStock(repo).run({ productId: stockProductMock.id, quantity }),
        ).rejects.toBeInstanceOf(InvalidQuantityError);
        expect(repo.findById).not.toHaveBeenCalled();
        expect(repo.save).not.toHaveBeenCalled();
      },
    );
  });
});
