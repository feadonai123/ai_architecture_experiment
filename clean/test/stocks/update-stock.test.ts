import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { UpdateStock } from '../../src/usecases/UpdateStock';
import { mockProductRepository } from '../mocks/product';
import {
  emptiedProductMock,
  invalidAbsoluteQuantityMock,
  missingProductMock,
  productMock,
  updatedProductMock,
  updateQuantityMock,
} from '../mocks/update-stock';

function updateStock(products = mockProductRepository({ findById: productMock })) {
  return new UpdateStock(products);
}

describe('update stock', () => {
  describe('success', () => {
    it('sets the product stock to the informed quantity', async () => {
      const result = await updateStock().run({
        productId: productMock.id,
        quantity: updateQuantityMock,
      });

      expect(result).toEqual(updatedProductMock);
    });

    it('allows setting stock to zero', async () => {
      await expect(updateStock().run({ productId: productMock.id, quantity: 0 })).resolves.toEqual(
        emptiedProductMock,
      );
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      await expect(
        updateStock().run({
          productId: productMock.id,
          quantity: invalidAbsoluteQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      await expect(
        updateStock(mockProductRepository({ findById: null })).run({
          productId: missingProductMock.id,
          quantity: updateQuantityMock,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
