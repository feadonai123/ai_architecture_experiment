import { ProductNotFoundError } from '../../src/errors';
import { getStock } from '../../src/routes/getStock';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { firstProductMock, missingProductIdMock } from '../mocks/stocks';

describe('get stock', () => {
  describe('success', () => {
    it('returns the requested product with its stock', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: firstProductMock }),
      });

      await expect(getStock(ds, firstProductMock.id)).resolves.toEqual(firstProductMock);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError when the product does not exist', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(getStock(ds, missingProductIdMock)).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
