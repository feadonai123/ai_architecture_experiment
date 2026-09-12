import { Request, Response } from 'express';
import { CartNotFoundError } from '../../src/errors/CartNotFoundError';
import { show } from '../../src/controllers/cart/routes/show.route';
import { mockCartFindWithItems } from '../mocks/cart';
import { cartMock, cartWithItemsMock, itemResponseMock, missingCartMock } from '../mocks/get-cart';
import { mockRes } from '../mocks/http';

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

describe('get cart', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('returns an empty cart', async () => {
      mockCartFindWithItems(cartMock);

      await expect(invokeHandler(show, { params: { cartId: cartMock.id } })).resolves.toMatchObject({
        id: cartMock.id,
        items: cartMock.items,
      });
    });

    it('returns a cart with items', async () => {
      mockCartFindWithItems(cartWithItemsMock);

      await expect(
        invokeHandler(show, { params: { cartId: cartWithItemsMock.id } }),
      ).resolves.toMatchObject({
        id: cartWithItemsMock.id,
        items: [itemResponseMock],
      });
    });
  });

  describe('errors', () => {
    it('throws CartNotFoundError', async () => {
      mockCartFindWithItems(null);
      await expect(
        invokeHandler(show, { params: { cartId: missingCartMock.id } }),
      ).rejects.toBeInstanceOf(CartNotFoundError);
    });
  });
});
