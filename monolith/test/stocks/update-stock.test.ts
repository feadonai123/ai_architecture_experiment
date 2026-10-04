import { InvalidQuantityError, ProductNotFoundError } from '../../src/errors';
import { updateStock } from '../../src/routes/updateStock';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import {
  invalidAbsoluteQuantityMock,
  missingProductMock,
  productMock,
  updateQuantityMock,
} from '../mocks/stocks';

describe('update stock', () => {
  describe('success', () => {
    it('sets the product stock to the informed quantity', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: { ...productMock } }) });

      const result = await updateStock(ds, {
        productId: productMock.id,
        quantity: updateQuantityMock,
      });

      expect(result.stock).toBe(updateQuantityMock);
    });

    it('allows setting stock to zero', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: { ...productMock } }) });

      await expect(
        updateStock(ds, { productId: productMock.id, quantity: 0 }),
      ).resolves.toEqual(expect.objectContaining({ stock: 0 }));
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      const ds = mockDataSource({});

      await expect(
        updateStock(ds, {
          productId: productMock.id,
          quantity: invalidAbsoluteQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(
        updateStock(ds, { productId: missingProductMock.id, quantity: updateQuantityMock }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
