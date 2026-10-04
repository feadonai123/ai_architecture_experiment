import { Request, Response } from 'express';
import { updateProduct } from '../../src/controllers/product/routes/updateProduct.route';
import { InvalidNameError } from '../../src/errors/InvalidNameError';
import { InvalidPriceError } from '../../src/errors/InvalidPriceError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockRes } from '../mocks/http';
import { mockProductFindById, mockProductSave } from '../mocks/product';
import {
  missingProductMock,
  productMock,
  updatedCatalogProductMock,
} from '../mocks/update-product';

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

function update(input: {
  productId: string;
  name: unknown;
  description?: unknown;
  price: unknown;
}) {
  return invokeHandler(updateProduct, {
    params: { productId: input.productId },
    body: { name: input.name, description: input.description, price: input.price },
  });
}

describe('update product', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('updates name, description and price', async () => {
      mockProductFindById({ ...productMock });
      mockProductSave();

      await expect(
        update({
          productId: productMock.id,
          name: updatedCatalogProductMock.name,
          description: updatedCatalogProductMock.description,
          price: updatedCatalogProductMock.price,
        }),
      ).resolves.toEqual(updatedCatalogProductMock);
    });

    it('does not change stock', async () => {
      mockProductFindById({ ...productMock });
      mockProductSave();

      const result = await update({
        productId: productMock.id,
        name: updatedCatalogProductMock.name,
        description: updatedCatalogProductMock.description,
        price: updatedCatalogProductMock.price,
      });

      expect(result.stock).toBe(productMock.stock);
    });
  });

  describe('errors', () => {
    it('throws ProductNotFoundError', async () => {
      mockProductFindById(null);

      await expect(
        update({ productId: missingProductMock.id, name: 'Tea', price: 10 }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InvalidNameError', async () => {
      await expect(
        update({ productId: productMock.id, name: '', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidNameError);
    });

    it('throws InvalidPriceError', async () => {
      await expect(
        update({ productId: productMock.id, name: 'Tea', price: -1 }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });
  });
});
