import { Request, Response } from 'express';
import { createProduct } from '../../src/controllers/product/routes/createProduct.route';
import { InvalidNameError } from '../../src/errors/InvalidNameError';
import { InvalidPriceError } from '../../src/errors/InvalidPriceError';
import { mockRes } from '../mocks/http';
import { mockProductCreate } from '../mocks/product';
import { createdProductMock, productMock } from '../mocks/create-product';

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

describe('create product', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('creates a product with stock 0', async () => {
      mockProductCreate(createdProductMock);

      await expect(
        invokeHandler(createProduct, {
          body: { name: productMock.name, price: productMock.price },
        }),
      ).resolves.toEqual(createdProductMock);
    });
  });

  describe('errors', () => {
    it('throws InvalidNameError', async () => {
      await expect(
        invokeHandler(createProduct, { body: { name: '  ', price: 10 } }),
      ).rejects.toBeInstanceOf(InvalidNameError);
    });

    it('throws InvalidPriceError', async () => {
      await expect(
        invokeHandler(createProduct, { body: { name: 'Tea', price: -1 } }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });
  });
});
