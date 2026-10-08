import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { create } from '../../src/controllers/order/routes/create.route';
import { setDataSource } from '../../src/database';
import { OrderStatus } from '../../src/enums/OrderStatus';
import { EmptyOrderItemsError } from '../../src/errors/EmptyOrderItemsError';
import { InsufficientStockError } from '../../src/errors/InsufficientStockError';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { UserNotFoundError } from '../../src/errors/UserNotFoundError';
import { EventType } from '../../src/events/EventType';
import { OrderCreatedEvent } from '../../src/events/OrderCreatedEvent';
import {
  createOrderInputMock,
  orderItemsMock,
  orderMock,
  orderProductMock,
  userMock,
} from '../mocks/create-order';
import { mockRes } from '../mocks/http';
import { mockOrderCreate } from '../mocks/order';
import { mockOrderItemCreate } from '../mocks/orderItem';
import { mockProductFindByIds } from '../mocks/product';
import { mockPublish } from '../mocks/redis';
import { mockUserFindById } from '../mocks/user';

jest.mock('uuid', () => ({ v4: jest.fn() }));

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

function createOrder(input: { userId: string; items: unknown }) {
  return invokeHandler(create, { body: input });
}

describe('create order', () => {
  let users: ReturnType<typeof mockUserFindById>;
  let products: ReturnType<typeof mockProductFindByIds>;
  let orders: ReturnType<typeof mockOrderCreate>;
  let items: ReturnType<typeof mockOrderItemCreate>;
  let publish: ReturnType<typeof mockPublish>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('id-1')
      .mockReturnValueOnce('id-2')
      .mockReturnValueOnce('id-3');
    users = mockUserFindById(userMock);
    products = mockProductFindByIds([orderProductMock]);
    orders = mockOrderCreate(orderMock());
    items = mockOrderItemCreate(orderItemsMock());
    publish = mockPublish();
    setDataSource({ transaction: jest.fn(async (run) => run({})) } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('saves order and items and requests publication of OrderCreated', async () => {
      const order = await createOrder(createOrderInputMock);

      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.total).toBe(30);
      expect(orders).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'id-1',
          userId: 'user-1',
          status: OrderStatus.PENDING,
          total: 30,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
        expect.any(Object),
      );
      expect(items).toHaveBeenCalledWith(orderItemsMock(), expect.any(Object));
      const event = publish.mock.calls[0][0] as OrderCreatedEvent;
      expect(event.getType()).toBe(EventType.OrderCreated);
      expect(event.getPayload()).toMatchObject({
        orderId: order.id,
        userId: order.userId,
        items: [
          { productId: 'product-1', quantity: 1 },
          { productId: 'product-1', quantity: 2 },
        ],
      });
    });
  });

  describe('errors', () => {
    it('rejects empty items', async () => {
      await expect(createOrder({ userId: 'user-1', items: [] })).rejects.toBeInstanceOf(
        EmptyOrderItemsError,
      );
      expect(orders).not.toHaveBeenCalled();
    });

    it('rejects items that are not an array', async () => {
      await expect(createOrder({ userId: 'user-1', items: {} })).rejects.toBeInstanceOf(
        EmptyOrderItemsError,
      );
      expect(orders).not.toHaveBeenCalled();
    });

    it('rejects invalid quantities', async () => {
      await expect(
        createOrder({ userId: 'user-1', items: [{ productId: 'product-1', quantity: 0 }] }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('rejects missing user', async () => {
      users.mockResolvedValue(null);
      await expect(
        createOrder({ userId: 'missing', items: [{ productId: 'product-1', quantity: 1 }] }),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it('rejects missing product', async () => {
      products.mockResolvedValue([]);
      await expect(
        createOrder({ userId: 'user-1', items: [{ productId: 'missing', quantity: 1 }] }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('checks aggregate stock for duplicate products', async () => {
      await expect(
        createOrder({
          userId: 'user-1',
          items: [
            { productId: 'product-1', quantity: 6 },
            { productId: 'product-1', quantity: 5 },
          ],
        }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(publish).not.toHaveBeenCalled();
    });
  });
});
