import { InvalidNameError } from '../../src/catalog/createProduct/errors/InvalidNameError';
import { InvalidPriceError } from '../../src/catalog/createProduct/errors/InvalidPriceError';
import { CreateProduct } from '../../src/catalog/createProduct/usecases/CreateProduct';
import { mockProductRepository } from '../mocks/product';
import { createdProductMock, productMock } from '../mocks/create-product';

function createProduct(products = mockProductRepository()) {
  return new CreateProduct(products, () => productMock.id);
}

describe('create product', () => {
  describe('success', () => {
    it('creates a product with stock 0', async () => {
      await expect(
        createProduct().run({ name: productMock.name, price: productMock.price }),
      ).resolves.toEqual(createdProductMock);
    });
  });

  describe('errors', () => {
    it('throws InvalidNameError', async () => {
      await expect(createProduct().run({ name: '  ', price: 10 })).rejects.toBeInstanceOf(
        InvalidNameError,
      );
    });

    it('throws InvalidPriceError', async () => {
      await expect(createProduct().run({ name: 'Tea', price: -1 })).rejects.toBeInstanceOf(
        InvalidPriceError,
      );
    });
  });
});
