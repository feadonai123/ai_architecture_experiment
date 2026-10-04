import { Request, Response } from 'express';
import { listStocks } from '../../src/controllers/stock/routes/listStocks.route';
import { mockRes } from '../mocks/http';
import { mockProductFindAll } from '../mocks/product';
import { productMock, secondProductMock } from '../mocks/list-stocks';

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
    it('returns all products with their stocks', async () => {
      mockProductFindAll([productMock, secondProductMock]);

      await expect(invokeHandler(listStocks)).resolves.toEqual([productMock, secondProductMock]);
    });

    it('returns an empty list when there are no products', async () => {
      mockProductFindAll([]);

      await expect(invokeHandler(listStocks)).resolves.toEqual([]);
    });
  });
});
