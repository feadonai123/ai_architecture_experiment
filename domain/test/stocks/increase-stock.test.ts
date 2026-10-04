import { InvalidQuantityError } from '../../src/inventory/increaseStock/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/inventory/increaseStock/errors/ProductNotFoundError';
import { IncreaseStock } from '../../src/inventory/increaseStock/usecases/IncreaseStock';
import { mockProductRepository } from '../mocks/product';
import {
  increaseQuantityMock,
  increasedProductMock,
  invalidQuantityMock,
  missingProductMock,
  productMock,
} from '../mocks/increase-stock';

function increaseStock(products = mockProductRepository({ findById: productMock })) {
  return new IncreaseStock(products);
}

describe('increase stock', () => {
  describe('success', () => {
    it('adds the informed quantity to the current stock', async () => {
      const result = await increaseStock().run({
        productId: productMock.id,
        quantity: increaseQuantityMock,
      });

      expect(result).toEqual(increasedProductMock);
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      await expect(
        increaseStock().run({
          productId: productMock.id,
          quantity: invalidQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      await expect(
        increaseStock(mockProductRepository({ findById: null })).run({
          productId: missingProductMock.id,
          quantity: increaseQuantityMock,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
