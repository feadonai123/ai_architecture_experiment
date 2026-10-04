import { Request, Response } from 'express';
import { increaseStock } from '../../src/controllers/stock/routes/increaseStock.route';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockRes } from '../mocks/http';
import { mockProductFindById, mockProductSave } from '../mocks/product';
import { stockProductMock } from '../mocks/stocks';

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

describe('increase stock', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('returns the expected product data', async () => {
      mockProductFindById({ ...stockProductMock });
      const save = mockProductSave();

      await expect(
        invokeHandler(increaseStock, {
          params: { productId: stockProductMock.id },
          body: { quantity: 4 },
        }),
      ).resolves.toEqual({ ...stockProductMock, stock: 14 });
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ stock: 14 }));
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError without saving', async () => {
      const save = mockProductSave();
      mockProductFindById(null);

      await expect(
        invokeHandler(increaseStock, { params: { productId: 'missing' }, body: { quantity: 1 } }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(save).not.toHaveBeenCalled();
    });

    it.each([0, -1, 1.5, '5', null, undefined, true, NaN, Infinity])(
      'rejects invalid quantity %p before reading persistence',
      async (quantity) => {
        const findById = mockProductFindById({ ...stockProductMock });
        const save = mockProductSave();

        await expect(
          invokeHandler(increaseStock, {
            params: { productId: stockProductMock.id },
            body: { quantity },
          }),
        ).rejects.toBeInstanceOf(InvalidQuantityError);
        expect(findById).not.toHaveBeenCalled();
        expect(save).not.toHaveBeenCalled();
      },
    );
  });
});
