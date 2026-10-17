import { InsufficientStockError } from '../../src/errors/InsufficientStockError';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { DecreaseStock } from '../../src/usecases/DecreaseStock';
import { mockProductRepository } from '../mocks/productRepository';
import {
  decreaseQuantityMock,
  decreasedProductMock,
  emptiedProductMock,
  exceedingQuantityMock,
  invalidQuantityMock,
  missingProductMock,
  productMock,
} from '../data/decrease-stock';

function decreaseStock(products = mockProductRepository({ findById: productMock })) {
  return new DecreaseStock(products);
}

describe('decrease stock', () => {
  describe('success', () => {
    it('removes the informed quantity from the current stock', async () => {
      const result = await decreaseStock().run({
        productId: productMock.id,
        quantity: decreaseQuantityMock,
      });

      expect(result).toEqual(decreasedProductMock);
    });

    it('allows decreasing the stock to zero', async () => {
      await expect(
        decreaseStock().run({ productId: productMock.id, quantity: productMock.stock }),
      ).resolves.toEqual(emptiedProductMock);
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      await expect(
        decreaseStock().run({
          productId: productMock.id,
          quantity: invalidQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      await expect(
        decreaseStock(mockProductRepository({ findById: null })).run({
          productId: missingProductMock.id,
          quantity: decreaseQuantityMock,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InsufficientStockError', async () => {
      await expect(
        decreaseStock().run({
          productId: productMock.id,
          quantity: exceedingQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
    });
  });
});
