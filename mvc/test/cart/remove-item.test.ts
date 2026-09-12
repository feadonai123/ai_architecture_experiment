import { Request, Response } from 'express';
import { CartItemNotFoundError } from '../../src/errors/CartItemNotFoundError';
import { CartNotFoundError } from '../../src/errors/CartNotFoundError';
import { removeItem } from '../../src/controllers/cart/routes/removeItem.route';
import { mockCartFindById, mockCartFindWithItems } from '../mocks/cart';
import { mockCartItemFindByCartAndProduct, mockCartItemRemove } from '../mocks/cartItem';
import { mockRes } from '../mocks/http';
import {
  cartMock,
  itemMock,
  missingCartMock,
  missingProductMock,
  productMock,
} from '../mocks/remove-item';

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

function removeCartItem(cartId: string, productId: string) {
  return invokeHandler(removeItem, {
    params: { productId },
    query: { cartId },
  });
}

describe('remove item', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('removes the item', async () => {
      mockCartFindById(cartMock);
      mockCartItemFindByCartAndProduct(itemMock);
      mockCartItemRemove();
      mockCartFindWithItems(cartMock);

      const result = await removeCartItem(cartMock.id, productMock.id);
      expect(result.items).toEqual(cartMock.items);
    });
  });

  describe('errors', () => {
    it('throws CartNotFoundError', async () => {
      mockCartFindById(null);
      await expect(removeCartItem(missingCartMock.id, productMock.id)).rejects.toBeInstanceOf(
        CartNotFoundError,
      );
    });

    it('throws CartItemNotFoundError', async () => {
      mockCartFindById(cartMock);
      mockCartItemFindByCartAndProduct(null);
      await expect(removeCartItem(cartMock.id, missingProductMock.id)).rejects.toBeInstanceOf(
        CartItemNotFoundError,
      );
    });
  });
});
