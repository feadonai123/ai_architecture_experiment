import {
  InsufficientStockError,
  InvalidQuantityError,
  ProductNotFoundError,
} from '../../src/errors';
import { decreaseStock } from '../../src/routes/decreaseStock';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import {
  decreaseQuantityMock,
  exceedingQuantityMock,
  invalidQuantityMock,
  missingProductMock,
  productMock,
} from '../mocks/stocks';

describe('decrease stock', () => {
  describe('success', () => {
    it('removes the informed quantity from the current stock', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: { ...productMock } }) });

      const result = await decreaseStock(ds, {
        productId: productMock.id,
        quantity: decreaseQuantityMock,
      });

      expect(result.stock).toBe(productMock.stock - decreaseQuantityMock);
    });

    it('allows decreasing the stock to zero', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: { ...productMock } }) });

      await expect(
        decreaseStock(ds, { productId: productMock.id, quantity: productMock.stock }),
      ).resolves.toEqual(expect.objectContaining({ stock: 0 }));
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      const ds = mockDataSource({});

      await expect(
        decreaseStock(ds, {
          productId: productMock.id,
          quantity: invalidQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(
        decreaseStock(ds, { productId: missingProductMock.id, quantity: decreaseQuantityMock }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InsufficientStockError', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: { ...productMock } }) });

      await expect(
        decreaseStock(ds, { productId: productMock.id, quantity: exceedingQuantityMock }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
    });
  });
});
