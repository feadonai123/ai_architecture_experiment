import { InvalidQuantityError, ProductNotFoundError } from '../../src/errors';
import { increaseStock } from '../../src/routes/increaseStock';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import {
  increaseQuantityMock,
  invalidQuantityMock,
  missingProductMock,
  productMock,
} from '../mocks/increase-stock';

describe('increase stock', () => {
  describe('success', () => {
    it('adds the informed quantity to the current stock', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: { ...productMock } }) });

      const result = await increaseStock(ds, {
        productId: productMock.id,
        quantity: increaseQuantityMock,
      });

      expect(result.stock).toBe(productMock.stock + increaseQuantityMock);
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      const ds = mockDataSource({});

      await expect(
        increaseStock(ds, {
          productId: productMock.id,
          quantity: invalidQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(
        increaseStock(ds, { productId: missingProductMock.id, quantity: increaseQuantityMock }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
