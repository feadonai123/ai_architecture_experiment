import {
  InsufficientStockError,
  InvalidQuantityError,
  ProductNotFoundError,
} from '../../src/errors';
import { decreaseStock } from '../../src/routes/decreaseStock';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { firstProductMock, missingProductIdMock } from '../mocks/stocks';

describe('decrease stock', () => {
  describe('success', () => {
    it('removes the informed quantity from the current stock', async () => {
      const product = { ...firstProductMock };
      const repository = mockProductRepo({ findOne: product });
      const ds = mockDataSource({ product: repository });

      const result = await decreaseStock(ds, { productId: product.id, quantity: 4 });

      expect(result.stock).toBe(6);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ stock: 6 }));
    });

    it('allows decreasing the stock to zero', async () => {
      const product = { ...firstProductMock };
      const ds = mockDataSource({ product: mockProductRepo({ findOne: product }) });

      await expect(
        decreaseStock(ds, { productId: product.id, quantity: product.stock }),
      ).resolves.toEqual(expect.objectContaining({ stock: 0 }));
    });
  });

  describe('errors', () => {
    it.each([0, -1, 1.5, '5', undefined])(
      'throws InvalidQuantityError for invalid quantity %p',
      async (quantity) => {
        const ds = mockDataSource({});

        await expect(
          decreaseStock(ds, { productId: firstProductMock.id, quantity }),
        ).rejects.toBeInstanceOf(InvalidQuantityError);
      },
    );

    it('throws ProductNotFoundError when the product does not exist', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(
        decreaseStock(ds, { productId: missingProductIdMock, quantity: 5 }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InsufficientStockError when quantity exceeds the current stock', async () => {
      const product = { ...firstProductMock };
      const repository = mockProductRepo({ findOne: product });
      const ds = mockDataSource({ product: repository });

      await expect(
        decreaseStock(ds, { productId: product.id, quantity: product.stock + 1 }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
