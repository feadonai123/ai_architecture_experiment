import { DecreaseStock } from '../../src/inventory/decreaseStock/usecases/DecreaseStock';
import { InvalidQuantityError } from '../../src/inventory/decreaseStock/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/inventory/decreaseStock/errors/ProductNotFoundError';
import { InsufficientStockError } from '../../src/inventory/decreaseStock/errors/InsufficientStockError';
import { mockStocks, stockProductMock } from '../mocks/stocks';
describe('decrease stock', () => {
  let repo: ReturnType<typeof mockStocks>;
  beforeEach(() => {
    repo = mockStocks();
  });
  describe('success', () => {
    it('returns the expected product data', async () => {
      const result = await new DecreaseStock(repo).run({
        productId: stockProductMock.id,
        quantity: 4,
      });
      expect(result).toEqual({ ...stockProductMock, stock: 6 });
      expect(repo.save).toHaveBeenCalledWith(result);
    });

    it('allows the resulting stock to be zero', async () => {
      await expect(
        new DecreaseStock(repo).run({ productId: stockProductMock.id, quantity: 10 }),
      ).resolves.toEqual({ ...stockProductMock, stock: 0 });
    });
  });
  describe('errors', () => {
    it('throws ProductNotFoundError without saving', async () => {
      repo.findById.mockResolvedValueOnce(null);
      await expect(
        new DecreaseStock(repo).run({ productId: 'missing', quantity: 1 }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(repo.save).not.toHaveBeenCalled();
    });
    it.each([0, -1, 1.5, '5', null, undefined, true, NaN, Infinity])(
      'rejects invalid quantity %p before reading persistence',
      async (quantity) => {
        await expect(
          new DecreaseStock(repo).run({ productId: stockProductMock.id, quantity }),
        ).rejects.toBeInstanceOf(InvalidQuantityError);
        expect(repo.findById).not.toHaveBeenCalled();
        expect(repo.save).not.toHaveBeenCalled();
      },
    );
    it('throws InsufficientStockError without changing the product', async () => {
      const product = { ...stockProductMock };
      repo.findById.mockResolvedValueOnce(product);
      await expect(
        new DecreaseStock(repo).run({ productId: product.id, quantity: 11 }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(product.stock).toBe(10);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
