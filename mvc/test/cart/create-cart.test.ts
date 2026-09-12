import { Request, Response } from 'express';
import { create } from '../../src/controllers/cart/routes/create.route';
import { cartMock, createdCartResponseMock } from '../mocks/create-cart';
import { mockCartCreateEmpty } from '../mocks/cart';
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

describe('create cart', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('creates an empty cart', async () => {
      mockCartCreateEmpty(cartMock);

      const result = await invokeHandler(create, {});
      expect(result).toEqual(createdCartResponseMock);
    });
  });
});
