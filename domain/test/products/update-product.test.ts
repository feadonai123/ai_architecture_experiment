import { InvalidNameError } from '../../src/catalog/updateProduct/errors/InvalidNameError';
import { InvalidPriceError } from '../../src/catalog/updateProduct/errors/InvalidPriceError';
import { ProductNotFoundError } from '../../src/catalog/updateProduct/errors/ProductNotFoundError';
import { UpdateProduct } from '../../src/catalog/updateProduct/usecases/UpdateProduct';
import { mockProductRepository } from '../mocks/product';
import {
  missingProductMock,
  productMock,
  updatedCatalogProductMock,
} from '../mocks/update-product';

function updateProduct(products = mockProductRepository({ findById: productMock })) {
  return new UpdateProduct(products);
}

describe('update product', () => {
  describe('success', () => {
    it('updates name, description and price', async () => {
      await expect(
        updateProduct().run({
          productId: productMock.id,
          name: updatedCatalogProductMock.name,
          description: updatedCatalogProductMock.description,
          price: updatedCatalogProductMock.price,
        }),
      ).resolves.toEqual(updatedCatalogProductMock);
    });

    it('does not change stock', async () => {
      const result = await updateProduct().run({
        productId: productMock.id,
        name: updatedCatalogProductMock.name,
        description: updatedCatalogProductMock.description,
        price: updatedCatalogProductMock.price,
      });

      expect(result.stock).toBe(productMock.stock);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError', async () => {
      await expect(
        updateProduct(mockProductRepository({ findById: null })).run({
          productId: missingProductMock.id,
          name: 'Tea',
          price: 10,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InvalidNameError', async () => {
      await expect(
        updateProduct().run({ productId: productMock.id, name: '', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidNameError);
    });

    it('throws InvalidPriceError', async () => {
      await expect(
        updateProduct().run({ productId: productMock.id, name: 'Tea', price: -1 }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });
  });
});
