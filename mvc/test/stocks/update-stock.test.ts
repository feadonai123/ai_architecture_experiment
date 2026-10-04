import { Request, Response } from 'express';
import { updateStock } from '../../src/controllers/stock/routes/updateStock.route';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockRes } from '../mocks/http';
import { mockProductFindById, mockProductSave } from '../mocks/product';
import {
  invalidAbsoluteQuantityMock,
  missingProductMock,
  productMock,
  updateQuantityMock,
} from '../mocks/stocks';

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

function update(input: { productId: string; quantity: unknown }) {
  return invokeHandler(updateStock, {
    params: { productId: input.productId },
    body: { quantity: input.quantity },
  });
}

describe('update stock', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('sets the product stock to the informed quantity', async () => {
      mockProductFindById({ ...productMock });
      mockProductSave();

      await expect(
        update({ productId: productMock.id, quantity: updateQuantityMock }),
      ).resolves.toEqual({ ...productMock, stock: updateQuantityMock });
    });

    it('allows setting stock to zero', async () => {
      mockProductFindById({ ...productMock });
      mockProductSave();

      await expect(update({ productId: productMock.id, quantity: 0 })).resolves.toEqual({
        ...productMock,
        stock: 0,
      });
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      await expect(
        update({ productId: productMock.id, quantity: invalidAbsoluteQuantityMock }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      mockProductFindById(null);

      await expect(
        update({ productId: missingProductMock.id, quantity: updateQuantityMock }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
