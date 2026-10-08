import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { IncreaseStock } from '../../src/usecases/IncreaseStock';
import { mockProductRepository } from '../mocks/productRepository';
import {
  increaseQuantityMock,
  increasedProductMock,
  invalidQuantityMock,
  missingProductMock,
  productMock,
} from '../data/increase-stock';

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
