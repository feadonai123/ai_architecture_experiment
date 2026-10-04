import {
  DuplicateSlugError,
  InvalidNameError,
  InvalidPriceError,
  InvalidSlugError,
  ProductNotFoundError,
} from '../../src/errors';
import { updateProduct } from '../../src/routes/updateProduct';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import {
  missingProductMock,
  productMock,
  updatedCatalogProductMock,
} from '../mocks/update-product';

describe('update product', () => {
  describe('success', () => {
    it('updates name, slug, description and price', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: { ...productMock } }),
      });

      const result = await updateProduct(ds, {
        productId: productMock.id,
        name: updatedCatalogProductMock.name,
        slug: updatedCatalogProductMock.slug,
        description: updatedCatalogProductMock.description,
        price: updatedCatalogProductMock.price,
      });

      expect(result.name).toBe(updatedCatalogProductMock.name);
      expect(result.slug).toBe(updatedCatalogProductMock.slug);
      expect(result.description).toBe(updatedCatalogProductMock.description);
      expect(result.price).toBe(updatedCatalogProductMock.price);
    });

    it('does not change stock', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: { ...productMock } }),
      });

      const result = await updateProduct(ds, {
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
      const ds = mockDataSource({ product: mockProductRepo({ findOne: null }) });

      await expect(
        updateProduct(ds, {
          productId: missingProductMock.id,
          name: 'Tea',
          slug: 'tea',
          price: 10,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InvalidNameError', async () => {
      const ds = mockDataSource({});

      await expect(
        updateProduct(ds, { productId: productMock.id, name: '', slug: 'tea', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidNameError);
    });

    it('throws InvalidSlugError', async () => {
      const ds = mockDataSource({});

      await expect(
        updateProduct(ds, { productId: productMock.id, name: 'Tea', slug: '', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidSlugError);
    });

    it('throws InvalidPriceError', async () => {
      const ds = mockDataSource({});

      await expect(
        updateProduct(ds, { productId: productMock.id, name: 'Tea', slug: 'tea', price: -1 }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });

    it('throws DuplicateSlugError', async () => {
      const other = { ...productMock, id: 'product-2', slug: 'green-tea' };
      const repo = mockProductRepo();
      repo.findOne.mockResolvedValueOnce({ ...productMock }).mockResolvedValueOnce(other);
      const ds = mockDataSource({ product: repo });

      await expect(
        updateProduct(ds, {
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
