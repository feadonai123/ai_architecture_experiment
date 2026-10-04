import { Request, Response } from 'express';
import { deleteProduct } from '../../src/controllers/product/routes/deleteProduct.route';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockRes } from '../mocks/http';
import { mockProductFindById, mockProductSoftDelete } from '../mocks/product';
import { missingProductMock, productMock } from '../mocks/delete-product';

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

describe('delete product', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('soft-deletes the product', async () => {
      const current = { ...productMock, deletedAt: null };
      mockProductFindById(current);
      mockProductSoftDelete();

      const result = await invokeHandler(deleteProduct, {
        params: { productId: productMock.id },
      });

      expect(result.id).toBe(productMock.id);
      expect(current.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError when the product does not exist', async () => {
      mockProductFindById(null);

      await expect(
        invokeHandler(deleteProduct, { params: { productId: missingProductMock.id } }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
