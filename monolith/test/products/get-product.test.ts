import { ProductNotFoundError } from '../../src/errors';
import { getProduct } from '../../src/routes/getProduct';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { missingProductMock, productMock } from '../mocks/get-product';

describe('get product', () => {
  describe('success', () => {
    it('returns the requested product', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: productMock }) });

      await expect(getProduct(ds, productMock.id)).resolves.toEqual(productMock);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(getProduct(ds, missingProductMock.id)).rejects.toBeInstanceOf(
        ProductNotFoundError,
      );
    });
  });
});
