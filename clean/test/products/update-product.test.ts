import { DuplicateSlugError } from '../../src/errors/DuplicateSlugError';
import { InvalidNameError } from '../../src/errors/InvalidNameError';
import { InvalidPriceError } from '../../src/errors/InvalidPriceError';
import { InvalidSlugError } from '../../src/errors/InvalidSlugError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { UpdateProduct } from '../../src/usecases/UpdateProduct';
import { mockProductRepository } from '../mocks/productRepository';
import {
  missingProductMock,
  productMock,
  updatedCatalogProductMock,
} from '../data/update-product';

function updateProduct(products = mockProductRepository({ findById: productMock })) {
  return new UpdateProduct(products);
}

describe('update product', () => {
  describe('success', () => {
    it('updates name, slug, description and price', async () => {
      await expect(
        updateProduct().run({
          productId: productMock.id,
          name: updatedCatalogProductMock.name,
          slug: updatedCatalogProductMock.slug,
          description: updatedCatalogProductMock.description,
          price: updatedCatalogProductMock.price,
        }),
      ).resolves.toEqual(updatedCatalogProductMock);
    });

    it('does not change stock', async () => {
      const result = await updateProduct().run({
        productId: productMock.id,
        name: updatedCatalogProductMock.name,
        slug: updatedCatalogProductMock.slug,
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
          slug: 'tea',
          price: 10,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InvalidNameError', async () => {
      await expect(
        updateProduct().run({ productId: productMock.id, name: '', slug: 'tea', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidNameError);
    });

    it('throws InvalidSlugError', async () => {
      await expect(
        updateProduct().run({ productId: productMock.id, name: 'Tea', slug: '', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidSlugError);
    });

    it('throws InvalidPriceError', async () => {
      await expect(
        updateProduct().run({ productId: productMock.id, name: 'Tea', slug: 'tea', price: -1 }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });

    it('throws DuplicateSlugError', async () => {
      await expect(
        updateProduct(
          mockProductRepository({
            findById: productMock,
            findBySlug: missingProductMock,
          }),
        ).run({
          productId: productMock.id,
          name: updatedCatalogProductMock.name,
          slug: updatedCatalogProductMock.slug,
          description: updatedCatalogProductMock.description,
          price: updatedCatalogProductMock.price,
        }),
      ).rejects.toBeInstanceOf(DuplicateSlugError);
    });
  });
});
