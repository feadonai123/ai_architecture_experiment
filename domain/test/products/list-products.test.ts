import { InvalidFilterError } from '../../src/catalog/listProducts/errors/InvalidFilterError';
import { InvalidPriceError } from '../../src/catalog/listProducts/errors/InvalidPriceError';
import { ListProducts } from '../../src/catalog/listProducts/usecases/ListProducts';
import { mockProductRepository } from '../mocks/product';
import { productMock, secondProductMock, unavailableProductMock } from '../mocks/list-products';

function listProducts(
  products = mockProductRepository({ findByFilters: [productMock, secondProductMock] }),
) {
  return new ListProducts(products);
}

describe('list products', () => {
  describe('success', () => {
    it('returns all products', async () => {
      await expect(listProducts().run({})).resolves.toEqual([productMock, secondProductMock]);
    });

    it('returns an empty list when there are no products', async () => {
      await expect(
        listProducts(mockProductRepository({ findByFilters: [] })).run({}),
      ).resolves.toEqual([]);
    });

    it('filters by name', async () => {
      const products = mockProductRepository({ findByFilters: [productMock] });

      await expect(new ListProducts(products).run({ name: 'Tea' })).resolves.toEqual([productMock]);
      expect(products.findByFilters).toHaveBeenCalledWith({ name: 'Tea' });
    });

    it('filters by minPrice', async () => {
      const products = mockProductRepository({ findByFilters: [secondProductMock] });

      await expect(new ListProducts(products).run({ minPrice: '15' })).resolves.toEqual([
        secondProductMock,
      ]);
      expect(products.findByFilters).toHaveBeenCalledWith({ minPrice: 15 });
    });

    it('filters by maxPrice', async () => {
      const products = mockProductRepository({ findByFilters: [productMock] });

      await expect(new ListProducts(products).run({ maxPrice: '15' })).resolves.toEqual([
        productMock,
      ]);
      expect(products.findByFilters).toHaveBeenCalledWith({ maxPrice: 15 });
    });

    it('filters available products', async () => {
      const products = mockProductRepository({
        findByFilters: [productMock, secondProductMock],
      });

      await expect(new ListProducts(products).run({ available: 'true' })).resolves.toEqual([
        productMock,
        secondProductMock,
      ]);
      expect(products.findByFilters).toHaveBeenCalledWith({ available: true });
    });

    it('filters unavailable products', async () => {
      const products = mockProductRepository({ findByFilters: [unavailableProductMock] });

      await expect(new ListProducts(products).run({ available: 'false' })).resolves.toEqual([
        unavailableProductMock,
      ]);
      expect(products.findByFilters).toHaveBeenCalledWith({ available: false });
    });

    it('applies combined filters', async () => {
      const products = mockProductRepository({ findByFilters: [productMock] });

      await expect(
        new ListProducts(products).run({
          name: 'tea',
          minPrice: '5',
          maxPrice: '15',
          available: 'true',
        }),
      ).resolves.toEqual([productMock]);
      expect(products.findByFilters).toHaveBeenCalledWith({
        name: 'tea',
        minPrice: 5,
        maxPrice: 15,
        available: true,
      });
    });

    it('does not list deleted products', async () => {
      const products = mockProductRepository({ findByFilters: [productMock] });

      await expect(new ListProducts(products).run({})).resolves.toEqual([productMock]);
    });
  });

  describe('errors', () => {
    it('throws InvalidPriceError', async () => {
      await expect(listProducts().run({ minPrice: '-1' })).rejects.toBeInstanceOf(
        InvalidPriceError,
      );
    });

    it('throws InvalidFilterError', async () => {
      await expect(listProducts().run({ available: 'maybe' })).rejects.toBeInstanceOf(
        InvalidFilterError,
      );
    });
  });
});
