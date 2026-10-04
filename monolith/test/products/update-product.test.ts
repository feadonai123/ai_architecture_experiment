import { InvalidNameError, InvalidPriceError, ProductNotFoundError } from '../../src/errors';
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
    it('updates name, description and price', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: { ...productMock } }),
      });

      const result = await updateProduct(ds, {
        productId: productMock.id,
        name: updatedCatalogProductMock.name,
        description: updatedCatalogProductMock.description,
        price: updatedCatalogProductMock.price,
      });

      expect(result.name).toBe(updatedCatalogProductMock.name);
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
          price: 10,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InvalidNameError', async () => {
      const ds = mockDataSource({});

      await expect(
        updateProduct(ds, { productId: productMock.id, name: '', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidNameError);
    });

    it('throws InvalidPriceError', async () => {
      const ds = mockDataSource({});

      await expect(
        updateProduct(ds, { productId: productMock.id, name: 'Tea', price: -1 }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });
  });
});
