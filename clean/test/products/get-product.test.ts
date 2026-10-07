import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { GetProduct } from '../../src/usecases/GetProduct';
import { mockProductRepository } from '../mocks/productRepository';
import { missingProductMock, productMock } from '../data/get-product';

describe('get product', () => {
  describe('success', () => {
    it('returns the requested product', async () => {
      await expect(
        new GetProduct(mockProductRepository({ findById: productMock })).run(productMock.id),
      ).resolves.toEqual(productMock);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError', async () => {
      await expect(
        new GetProduct(mockProductRepository({ findById: null })).run(missingProductMock.id),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
