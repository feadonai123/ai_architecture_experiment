import { setDataSource } from '../../src/database';
import { mockPaymentTransaction } from '../mocks/paymentTransaction';
import { Request, Response } from 'express';
import { decreaseStock } from '../../src/controllers/stock/routes/decreaseStock.route';
import { InsufficientStockError } from '../../src/errors/InsufficientStockError';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockRes } from '../mocks/http';
import { mockProductFindByIdForUpdate, mockProductSave } from '../mocks/product';
import {
  decreaseQuantityMock,
  exceedingQuantityMock,
  invalidQuantityMock,
  missingProductMock,
  productMock,
} from '../mocks/decrease-stock';

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

function decrease(input: { productId: string; quantity: unknown }) {
  return invokeHandler(decreaseStock, {
    params: { productId: input.productId },
    body: { quantity: input.quantity },
  });
}

describe('decrease stock', () => {
  beforeEach(() => setDataSource(mockPaymentTransaction()));
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('removes the informed quantity from the current stock', async () => {
      mockProductFindByIdForUpdate({ ...productMock });
      mockProductSave();

      await expect(
        decrease({ productId: productMock.id, quantity: decreaseQuantityMock }),
      ).resolves.toEqual({
        ...productMock,
        stock: productMock.stock - decreaseQuantityMock,
      });
    });

    it('allows decreasing the stock to zero', async () => {
      mockProductFindByIdForUpdate({ ...productMock });
      mockProductSave();

      await expect(
        decrease({ productId: productMock.id, quantity: productMock.stock }),
      ).resolves.toEqual({ ...productMock, stock: 0 });
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      await expect(
        decrease({ productId: productMock.id, quantity: invalidQuantityMock }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      mockProductFindByIdForUpdate(null);

      await expect(
        decrease({ productId: missingProductMock.id, quantity: decreaseQuantityMock }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InsufficientStockError', async () => {
      mockProductFindByIdForUpdate({ ...productMock });

      await expect(
        decrease({ productId: productMock.id, quantity: exceedingQuantityMock }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
    });
  });
});
