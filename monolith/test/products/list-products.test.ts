import { InvalidFilterError, InvalidPriceError } from '../../src/errors';
import { listProducts } from '../../src/routes/listProducts';
import { mockDataSource } from '../mocks/dataSource';
import {
  mockQueryBuilder,
  productMock,
  secondProductMock,
  unavailableProductMock,
} from '../mocks/list-products';

describe('list products', () => {
  describe('success', () => {
    it('returns all products', async () => {
      const qb = mockQueryBuilder([productMock, secondProductMock]);
      const ds = mockDataSource({ product: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await expect(listProducts(ds, {})).resolves.toEqual([productMock, secondProductMock]);
    });

    it('returns an empty list when there are no products', async () => {
      const qb = mockQueryBuilder([]);
      const ds = mockDataSource({ product: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await expect(listProducts(ds, {})).resolves.toEqual([]);
    });

    it('filters by name', async () => {
      const qb = mockQueryBuilder([productMock]);
      const ds = mockDataSource({ product: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await expect(listProducts(ds, { name: 'Tea' })).resolves.toEqual([productMock]);
      expect(qb.andWhere).toHaveBeenCalledWith('LOWER(product.name) LIKE :name', {
        name: '%tea%',
      });
    });

    it('filters by minPrice', async () => {
      const qb = mockQueryBuilder([secondProductMock]);
      const ds = mockDataSource({ product: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await expect(listProducts(ds, { minPrice: '15' })).resolves.toEqual([secondProductMock]);
      expect(qb.andWhere).toHaveBeenCalledWith('product.price >= :minPrice', { minPrice: 15 });
    });

    it('filters by maxPrice', async () => {
      const qb = mockQueryBuilder([productMock]);
      const ds = mockDataSource({ product: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await expect(listProducts(ds, { maxPrice: '15' })).resolves.toEqual([productMock]);
      expect(qb.andWhere).toHaveBeenCalledWith('product.price <= :maxPrice', { maxPrice: 15 });
    });

    it('filters available products', async () => {
      const qb = mockQueryBuilder([productMock, secondProductMock]);
      const ds = mockDataSource({ product: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await expect(listProducts(ds, { available: 'true' })).resolves.toEqual([
        productMock,
        secondProductMock,
      ]);
      expect(qb.andWhere).toHaveBeenCalledWith('product.stock > 0');
    });

    it('filters unavailable products', async () => {
      const qb = mockQueryBuilder([unavailableProductMock]);
      const ds = mockDataSource({ product: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await expect(listProducts(ds, { available: 'false' })).resolves.toEqual([
        unavailableProductMock,
      ]);
      expect(qb.andWhere).toHaveBeenCalledWith('product.stock = 0');
    });

    it('applies combined filters', async () => {
      const qb = mockQueryBuilder([productMock]);
      const ds = mockDataSource({ product: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await expect(
        listProducts(ds, { name: 'tea', minPrice: '5', maxPrice: '15', available: 'true' }),
      ).resolves.toEqual([productMock]);
      expect(qb.andWhere).toHaveBeenCalledTimes(4);
    });

    it('does not list deleted products', async () => {
      const qb = mockQueryBuilder([productMock]);
      const ds = mockDataSource({ product: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await expect(listProducts(ds, {})).resolves.toEqual([productMock]);
      expect(qb.where).toHaveBeenCalledWith('product.deleted_at IS NULL');
    });
  });

  describe('errors', () => {
    it('throws InvalidPriceError', async () => {
      const ds = mockDataSource({});

      await expect(listProducts(ds, { minPrice: '-1' })).rejects.toBeInstanceOf(InvalidPriceError);
    });

    it('throws InvalidFilterError', async () => {
      const ds = mockDataSource({});

      await expect(listProducts(ds, { available: 'maybe' })).rejects.toBeInstanceOf(
        InvalidFilterError,
      );
    });
  });
});
