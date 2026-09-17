import { InvalidQuantityError, ProductNotFoundError } from '../../src/errors';
import { updateStock } from '../../src/routes/updateStock';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { firstProductMock, missingProductIdMock } from '../mocks/stocks';

describe('update stock', () => {
  describe('success', () => {
    it('sets the product stock to the informed quantity', async () => {
      const product = { ...firstProductMock };
      const repository = mockProductRepo({ findOne: product });
      const ds = mockDataSource({ product: repository });

      const result = await updateStock(ds, { productId: product.id, quantity: 25 });

      expect(result.stock).toBe(25);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ stock: 25 }));
    });

    it('allows setting stock to zero', async () => {
      const product = { ...firstProductMock };
      const ds = mockDataSource({ product: mockProductRepo({ findOne: product }) });

      await expect(updateStock(ds, { productId: product.id, quantity: 0 })).resolves.toEqual(
        expect.objectContaining({ stock: 0 }),
      );
    });
  });

  describe('errors', () => {
    it.each([-1, 1.5, '10', undefined])(
      'throws InvalidQuantityError for invalid quantity %p',
      async (quantity) => {
        const ds = mockDataSource({});

        await expect(
          updateStock(ds, { productId: firstProductMock.id, quantity }),
        ).rejects.toBeInstanceOf(InvalidQuantityError);
      },
    );

    it('throws ProductNotFoundError when the product does not exist', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(
        updateStock(ds, { productId: missingProductIdMock, quantity: 25 }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
