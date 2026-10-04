import {
  DuplicateSlugError,
  InvalidNameError,
  InvalidPriceError,
  InvalidSlugError,
} from '../../src/errors';
import { createProduct } from '../../src/routes/createProduct';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { productMock } from '../mocks/create-product';

describe('create product', () => {
  describe('success', () => {
    it('creates a product with stock 0', async () => {
      const ds = mockDataSource({ product: mockProductRepo() });

      const result = await createProduct(ds, {
        name: productMock.name,
        slug: productMock.slug,
        price: productMock.price,
      });

      expect(result.stock).toBe(0);
      expect(result.name).toBe(productMock.name);
      expect(result.slug).toBe(productMock.slug);
      expect(result.description).toBe('');
      expect(result.price).toBe(productMock.price);
    });

    it('allows the same name when the slug is different', async () => {
      const ds = mockDataSource({ product: mockProductRepo() });

      const result = await createProduct(ds, {
        name: productMock.name,
        slug: 'tea-leaf',
        price: productMock.price,
      });

      expect(result.name).toBe(productMock.name);
      expect(result.slug).toBe('tea-leaf');
    });
  });

  describe('errors', () => {
    it('throws InvalidNameError', async () => {
      const ds = mockDataSource({});

      await expect(
        createProduct(ds, { name: '  ', slug: 'tea', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidNameError);
    });

    it('throws InvalidSlugError', async () => {
      const ds = mockDataSource({});

      await expect(
        createProduct(ds, { name: 'Tea', slug: '  ', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidSlugError);
    });

    it('throws InvalidPriceError', async () => {
      const ds = mockDataSource({});

      await expect(
        createProduct(ds, { name: 'Tea', slug: 'tea', price: -1 }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });

    it('throws DuplicateSlugError', async () => {
      const ds = mockDataSource({ product: mockProductRepo({ findOne: productMock }) });

      await expect(
        createProduct(ds, { name: productMock.name, slug: productMock.slug, price: 10 }),
      ).rejects.toBeInstanceOf(DuplicateSlugError);
    });
  });
});
