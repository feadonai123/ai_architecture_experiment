import { ProductNotFoundError } from '../../src/errors';
import { getStock } from '../../src/routes/getStock';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { missingProductMock, productMock } from '../mocks/get-stock';

describe('get stock', () => {
  describe('success', () => {
    it('returns the requested product with its stock', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: productMock }),
      });

      await expect(getStock(ds, productMock.id)).resolves.toEqual(productMock);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(getStock(ds, missingProductMock.id)).rejects.toBeInstanceOf(
        ProductNotFoundError,
      );
    });
  });
});
