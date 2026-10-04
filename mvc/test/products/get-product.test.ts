import { Request, Response } from 'express';
import { getProduct } from '../../src/controllers/product/routes/getProduct.route';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockRes } from '../mocks/http';
import { mockProductFindById } from '../mocks/product';
import { missingProductMock, productMock } from '../mocks/get-product';

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

describe('get product', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('returns the requested product', async () => {
      mockProductFindById(productMock);

      await expect(
        invokeHandler(getProduct, { params: { productId: productMock.id } }),
      ).resolves.toEqual(productMock);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError', async () => {
      mockProductFindById(null);

      await expect(
        invokeHandler(getProduct, { params: { productId: missingProductMock.id } }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
