import { InvalidNameError, InvalidPriceError } from '../../src/errors';
import { createProduct } from '../../src/routes/createProduct';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';
import { productMock } from '../mocks/create-product';

describe('create product', () => {
  describe('success', () => {
    it('creates a product with stock 0', async () => {
      const ds = mockDataSource({ product: mockProductRepo() });

      const result = await createProduct(ds, { name: productMock.name, price: productMock.price });

      expect(result.stock).toBe(0);
      expect(result.name).toBe(productMock.name);
      expect(result.description).toBe('');
      expect(result.price).toBe(productMock.price);
    });
  });

  describe('errors', () => {
    it('throws InvalidNameError', async () => {
      const ds = mockDataSource({});

      await expect(createProduct(ds, { name: '  ', price: 10 })).rejects.toBeInstanceOf(
        InvalidNameError,
      );
    });

    it('throws InvalidPriceError', async () => {
      const ds = mockDataSource({});

      await expect(createProduct(ds, { name: 'Tea', price: -1 })).rejects.toBeInstanceOf(
        InvalidPriceError,
      );
    });
  });
});
