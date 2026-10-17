import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { GetStock } from '../../src/usecases/GetStock';
import { mockProductRepository } from '../mocks/productRepository';
import { missingProductMock, productMock } from '../data/get-stock';

function getStock(products = mockProductRepository({ findById: productMock })) {
  return new GetStock(products);
}

describe('get stock', () => {
  describe('success', () => {
    it('returns the requested product with its stock', async () => {
      await expect(getStock().run(productMock.id)).resolves.toEqual(productMock);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError', async () => {
      await expect(
        getStock(mockProductRepository({ findById: null })).run(missingProductMock.id),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
