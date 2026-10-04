import { Request, Response } from 'express';
import { updateProduct } from '../../src/controllers/product/routes/updateProduct.route';
import { DuplicateSlugError } from '../../src/errors/DuplicateSlugError';
import { InvalidNameError } from '../../src/errors/InvalidNameError';
import { InvalidPriceError } from '../../src/errors/InvalidPriceError';
import { InvalidSlugError } from '../../src/errors/InvalidSlugError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { mockRes } from '../mocks/http';
import { mockProductFindById, mockProductFindBySlug, mockProductSave } from '../mocks/product';
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
  slug?: unknown;
  description?: unknown;
  price: unknown;
}) {
  return invokeHandler(updateProduct, {
    params: { productId: input.productId },
    body: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      price: input.price,
    },
  });
}

describe('update product', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('updates name, slug, description and price', async () => {
      mockProductFindById({ ...productMock });
      mockProductFindBySlug(null);
      mockProductSave();

      await expect(
        update({
          productId: productMock.id,
          name: updatedCatalogProductMock.name,
          slug: updatedCatalogProductMock.slug,
          description: updatedCatalogProductMock.description,
          price: updatedCatalogProductMock.price,
        }),
      ).resolves.toEqual(updatedCatalogProductMock);
    });

    it('does not change stock', async () => {
      mockProductFindById({ ...productMock });
      mockProductFindBySlug(null);
      mockProductSave();

      const result = await update({
        productId: productMock.id,
        name: updatedCatalogProductMock.name,
        slug: updatedCatalogProductMock.slug,
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
        update({ productId: missingProductMock.id, name: 'Tea', slug: 'tea', price: 10 }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InvalidNameError', async () => {
      await expect(
        update({ productId: productMock.id, name: '', slug: 'tea', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidNameError);
    });

    it('throws InvalidSlugError', async () => {
      await expect(
        update({ productId: productMock.id, name: 'Tea', slug: '', price: 10 }),
      ).rejects.toBeInstanceOf(InvalidSlugError);
    });

    it('throws InvalidPriceError', async () => {
      await expect(
        update({ productId: productMock.id, name: 'Tea', slug: 'tea', price: -1 }),
      ).rejects.toBeInstanceOf(InvalidPriceError);
    });

    it('throws DuplicateSlugError', async () => {
      mockProductFindById({ ...productMock });
      mockProductFindBySlug({ ...productMock, id: 'product-2', slug: 'green-tea' });

      await expect(
        update({
          productId: productMock.id,
          name: updatedCatalogProductMock.name,
          slug: updatedCatalogProductMock.slug,
          description: updatedCatalogProductMock.description,
          price: updatedCatalogProductMock.price,
        }),
      ).rejects.toBeInstanceOf(DuplicateSlugError);
    });
  });
});
