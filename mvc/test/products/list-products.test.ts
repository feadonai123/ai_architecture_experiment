import { Request, Response } from 'express';
import { listProducts } from '../../src/controllers/product/routes/listProducts.route';
import { InvalidFilterError } from '../../src/errors/InvalidFilterError';
import { InvalidPriceError } from '../../src/errors/InvalidPriceError';
import { mockRes } from '../mocks/http';
import { mockProductFindByFilters } from '../mocks/product';
import { productMock, secondProductMock, unavailableProductMock } from '../mocks/list-products';

async function invokeHandler(
  handler: (req: Request, res: Response, next: (err?: unknown) => void) => Promise<void>,
  req: Partial<Request> = {},
) {
  const res = mockRes();
  const next = jest.fn();
  await handler(req as Request, res, next);
  if (next.mock.calls[0]?.[0]) {
    throw next.mock.calls[0][0];
  }
  return res.json.mock.calls[0]?.[0];
}

describe('list products', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('returns all products', async () => {
      mockProductFindByFilters([productMock, secondProductMock]);

      await expect(invokeHandler(listProducts, { query: {} })).resolves.toEqual([
        productMock,
        secondProductMock,
      ]);
    });

    it('returns an empty list when there are no products', async () => {
      mockProductFindByFilters([]);

      await expect(invokeHandler(listProducts, { query: {} })).resolves.toEqual([]);
    });

    it('filters by name', async () => {
      const spy = mockProductFindByFilters([productMock]);

      await expect(invokeHandler(listProducts, { query: { name: 'Tea' } })).resolves.toEqual([
        productMock,
      ]);
      expect(spy).toHaveBeenCalledWith({ name: 'Tea' });
    });

    it('filters by minPrice', async () => {
      const spy = mockProductFindByFilters([secondProductMock]);

      await expect(invokeHandler(listProducts, { query: { minPrice: '15' } })).resolves.toEqual([
        secondProductMock,
      ]);
      expect(spy).toHaveBeenCalledWith({ minPrice: 15 });
    });

    it('filters by maxPrice', async () => {
      const spy = mockProductFindByFilters([productMock]);

      await expect(invokeHandler(listProducts, { query: { maxPrice: '15' } })).resolves.toEqual([
        productMock,
      ]);
      expect(spy).toHaveBeenCalledWith({ maxPrice: 15 });
    });

    it('filters available products', async () => {
      const spy = mockProductFindByFilters([productMock, secondProductMock]);

      await expect(invokeHandler(listProducts, { query: { available: 'true' } })).resolves.toEqual([
        productMock,
        secondProductMock,
      ]);
      expect(spy).toHaveBeenCalledWith({ available: true });
    });

    it('filters unavailable products', async () => {
      const spy = mockProductFindByFilters([unavailableProductMock]);

      await expect(invokeHandler(listProducts, { query: { available: 'false' } })).resolves.toEqual(
        [unavailableProductMock],
      );
      expect(spy).toHaveBeenCalledWith({ available: false });
    });

    it('applies combined filters', async () => {
      const spy = mockProductFindByFilters([productMock]);

      await expect(
        invokeHandler(listProducts, {
          query: { name: 'tea', minPrice: '5', maxPrice: '15', available: 'true' },
        }),
      ).resolves.toEqual([productMock]);
      expect(spy).toHaveBeenCalledWith({
        name: 'tea',
        minPrice: 5,
        maxPrice: 15,
        available: true,
      });
    });

    it('does not list deleted products', async () => {
      mockProductFindByFilters([productMock]);

      await expect(invokeHandler(listProducts, { query: {} })).resolves.toEqual([productMock]);
    });
  });

  describe('errors', () => {
    it('throws InvalidPriceError', async () => {
      await expect(
        invokeHandler(listProducts, { query: { minPrice: '-1' } }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });

    it('throws InvalidFilterError', async () => {
      await expect(
        invokeHandler(listProducts, { query: { available: 'maybe' } }),
      ).rejects.toBeInstanceOf(InvalidFilterError);
    });
  });
});
