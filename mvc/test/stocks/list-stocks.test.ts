import { Request, Response } from 'express';
import { listStocks } from '../../src/controllers/stock/routes/listStocks.route';
import { mockRes } from '../mocks/http';
import { mockProductFindAll } from '../mocks/product';
import { stockProductMock } from '../mocks/stocks';

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

describe('list stocks', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('returns the expected product data', async () => {
      mockProductFindAll([{ ...stockProductMock }]);

      await expect(invokeHandler(listStocks)).resolves.toEqual([stockProductMock]);
    });

    it('returns an empty list when no products exist', async () => {
      mockProductFindAll([]);

      await expect(invokeHandler(listStocks)).resolves.toEqual([]);
    });
  });
});
