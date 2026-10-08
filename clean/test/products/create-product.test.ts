import { DuplicateSlugError } from '../../src/errors/DuplicateSlugError';
import { InvalidNameError } from '../../src/errors/InvalidNameError';
import { InvalidPriceError } from '../../src/errors/InvalidPriceError';
import { InvalidSlugError } from '../../src/errors/InvalidSlugError';
import { CreateProduct } from '../../src/usecases/CreateProduct';
import { mockProductRepository } from '../mocks/productRepository';
import { mockIdentifier } from '../mocks/identifier';
import { createdProductMock, productMock } from '../data/create-product';

function createProduct(products = mockProductRepository()) {
  return new CreateProduct(products, mockIdentifier(productMock.id));
}

describe('create product', () => {
  describe('success', () => {
    it('creates a product with stock 0', async () => {
      await expect(
        createProduct().run({
          name: productMock.name,
          slug: productMock.slug,
          price: productMock.price,
        }),
      ).resolves.toEqual(createdProductMock);
    });
  });

  describe('errors', () => {
    it('throws InvalidNameError', async () => {
      await expect(
        createProduct().run({ name: '  ', slug: 'tea', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidNameError);
    });

    it('throws InvalidSlugError', async () => {
      await expect(
        createProduct().run({ name: 'Tea', slug: '  ', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidSlugError);
    });

    it('throws InvalidPriceError', async () => {
      await expect(
        createProduct().run({ name: 'Tea', slug: 'tea', price: -1 }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });

    it('throws DuplicateSlugError', async () => {
      await expect(
        createProduct(mockProductRepository({ findBySlug: productMock })).run({
          name: productMock.name,
          slug: productMock.slug,
          price: productMock.price,
        }),
      ).rejects.toBeInstanceOf(DuplicateSlugError);
    });
  });
});
