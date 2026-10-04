import { Request, Response } from 'express';
import { increaseStock } from '../../src/controllers/stock/routes/increaseStock.route';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockRes } from '../mocks/http';
import { mockProductFindById, mockProductSave } from '../mocks/product';
import {
  increaseQuantityMock,
  invalidQuantityMock,
  missingProductMock,
  productMock,
} from '../mocks/increase-stock';

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

function increase(input: { productId: string; quantity: unknown }) {
  return invokeHandler(increaseStock, {
    params: { productId: input.productId },
    body: { quantity: input.quantity },
  });
}

describe('increase stock', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('adds the informed quantity to the current stock', async () => {
      mockProductFindById({ ...productMock });
      mockProductSave();

      await expect(
        increase({ productId: productMock.id, quantity: increaseQuantityMock }),
      ).resolves.toEqual({
        ...productMock,
        stock: productMock.stock + increaseQuantityMock,
      });
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      await expect(
        increase({ productId: productMock.id, quantity: invalidQuantityMock }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      mockProductFindById(null);

      await expect(
        increase({ productId: missingProductMock.id, quantity: increaseQuantityMock }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
  });
});
