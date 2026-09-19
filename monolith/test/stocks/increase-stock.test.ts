import { InvalidQuantityError, ProductNotFoundError } from '../../src/errors';
import { increaseStock } from '../../src/routes/increaseStock';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { firstProductMock, missingProductIdMock } from '../mocks/stocks';

describe('increase stock', () => {
  describe('success', () => {
    it('adds the informed quantity to the current stock', async () => {
      const product = { ...firstProductMock };
      const repository = mockProductRepo({ findOne: product });
      const ds = mockDataSource({ product: repository });

      const result = await increaseStock(ds, { productId: product.id, quantity: 5 });

      expect(result.stock).toBe(15);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ stock: 15 }));
    });
  });

  describe('errors', () => {
    it.each([0, -1, 1.5, '5', undefined])(
      'throws InvalidQuantityError for invalid quantity %p',
      async (quantity) => {
        const ds = mockDataSource({});

        await expect(
          increaseStock(ds, { productId: firstProductMock.id, quantity }),
        ).rejects.toBeInstanceOf(InvalidQuantityError);
      },
    );

    it('throws ProductNotFoundError when the product does not exist', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(
        increaseStock(ds, { productId: missingProductIdMock, quantity: 5 }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
