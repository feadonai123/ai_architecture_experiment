import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { DeleteProduct } from '../../src/usecases/DeleteProduct';
import { mockProductRepository } from '../mocks/productRepository';
import { missingProductMock, productMock } from '../data/delete-product';

describe('delete product', () => {
  describe('success', () => {
    it('soft-deletes the product', async () => {
      const products = mockProductRepository({ findById: productMock });
      const result = await new DeleteProduct(products).run(productMock.id);

      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(products.softDelete).toHaveBeenCalledWith(result);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError when the product does not exist', async () => {
      await expect(
        new DeleteProduct(mockProductRepository({ findById: null })).run(missingProductMock.id),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
