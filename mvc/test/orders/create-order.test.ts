import { Request, Response } from 'express';
import { create } from '../../src/controllers/order/routes/create.route';
import { EmptyOrderItemsError } from '../../src/errors/EmptyOrderItemsError';
import { InsufficientStockError } from '../../src/errors/InsufficientStockError';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { UserNotFoundError } from '../../src/errors/UserNotFoundError';
import { OrderCreatedEvent } from '../../src/events/OrderCreatedEvent';
import {
  createOrderInputMock,
  orderMock,
  productsMock,
  userMock,
} from '../mocks/create-order';
import { mockRes } from '../mocks/http';
import { mockOrderCreateWithItems } from '../mocks/order';
import { mockProductFindByIds } from '../mocks/product';
import { mockPublish } from '../mocks/redis';
import { mockUserFindById } from '../mocks/user';

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
  return { body: res.json.mock.calls[0]?.[0], status: res.status.mock.calls[0]?.[0] };
}

function createOrder(input: { userId: string; items: unknown }) {
  return invokeHandler(create, { body: input });
}

describe('create order', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('creates a pending order with current prices and calculated total', async () => {
      mockUserFindById(userMock);
      mockProductFindByIds(productsMock);
      const createWithItems = mockOrderCreateWithItems(orderMock);
      const publish = mockPublish();

      const result = await createOrder(createOrderInputMock);

      expect(createWithItems).toHaveBeenCalledWith(userMock.id, [
        { productId: productsMock[0].id, quantity: 2, unitPrice: 100 },
        { productId: productsMock[1].id, quantity: 1, unitPrice: 50 },
      ]);
      expect(publish).toHaveBeenCalledWith(expect.any(OrderCreatedEvent));
      const event = publish.mock.calls[0][0] as OrderCreatedEvent;
      expect(event.getId()).toBe(orderMock.id);
      expect(event.getPayload()).toEqual({
        orderId: orderMock.id,
        userId: userMock.id,
        items: createOrderInputMock.items,
      });
      expect(result).toEqual({
        status: 201,
        body: {
          id: orderMock.id,
          userId: userMock.id,
          status: 'PENDING',
          total: 250,
          createdAt: '2026-09-19T18:30:00.000Z',
          items: [
            { productId: productsMock[0].id, quantity: 2, unitPrice: 100 },
            { productId: productsMock[1].id, quantity: 1, unitPrice: 50 },
          ],
        },
      });
    });
  });

  describe('errors', () => {
    it('throws EmptyOrderItemsError for an empty list', async () => {
      await expect(createOrder({ userId: userMock.id, items: [] })).rejects.toBeInstanceOf(
        EmptyOrderItemsError,
      );
    });

    it('throws InvalidQuantityError before consulting models', async () => {
      const findUser = mockUserFindById(userMock);

      await expect(
        createOrder({
          userId: userMock.id,
          items: [{ productId: productsMock[0].id, quantity: 0 }],
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
      expect(findUser).not.toHaveBeenCalled();
    });

    it('throws UserNotFoundError', async () => {
      mockUserFindById(null);

      await expect(createOrder(createOrderInputMock)).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it('throws ProductNotFoundError', async () => {
      mockUserFindById(userMock);
      mockProductFindByIds([productsMock[0]]);

      await expect(createOrder(createOrderInputMock)).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws InsufficientStockError for aggregated duplicate quantities', async () => {
      mockUserFindById(userMock);
      mockProductFindByIds([productsMock[0]]);

      await expect(
        createOrder({
          userId: userMock.id,
          items: [
            { productId: productsMock[0].id, quantity: 6 },
            { productId: productsMock[0].id, quantity: 5 },
          ],
        }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
    });
  });
});
