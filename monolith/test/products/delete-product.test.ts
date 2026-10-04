import { ProductNotFoundError } from '../../src/errors';
import { deleteProduct } from '../../src/routes/deleteProduct';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { missingProductMock, productMock } from '../mocks/delete-product';

describe('delete product', () => {
  describe('success', () => {
    it('soft-deletes the product', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: { ...productMock, deletedAt: null } }),
      });

      const result = await deleteProduct(ds, productMock.id);

      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError when the product does not exist', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(deleteProduct(ds, missingProductMock.id)).rejects.toBeInstanceOf(
        ProductNotFoundError,
      );
    });
  });
});
