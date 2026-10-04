import { Request, Response } from 'express';
import { getStock } from '../../src/controllers/stock/routes/getStock.route';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockRes } from '../mocks/http';
import { mockProductFindById } from '../mocks/product';
import { missingProductMock, productMock } from '../mocks/stocks';

async function invokeHandler(
  handler: (req: Request, res: Response, next: (err?: unknown) => void) => Promise<void>,
  req: Partial<Request>,
) {
  const res = mockRes();
  const next = jest.fn();
  await handler(req as Request, res, next);
  if (next.mock.calls[0]?.[0]) {
    throw next.mock.calls[0][0];
  }
  return res.json.mock.calls[0]?.[0];
}

describe('get stock', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('returns the requested product with its stock', async () => {
      mockProductFindById({ ...productMock });

      await expect(
        invokeHandler(getStock, { params: { productId: productMock.id } }),
      ).resolves.toEqual(productMock);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError', async () => {
      mockProductFindById(null);

      await expect(
        invokeHandler(getStock, { params: { productId: missingProductMock.id } }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
