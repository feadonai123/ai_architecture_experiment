import { v4 as uuidv4 } from 'uuid';
import {
  EmptyOrderItemsError,
  InsufficientStockError,
  InvalidQuantityError,
  ProductNotFoundError,
  UserNotFoundError,
} from '../../src/errors';
import { OrderStatus } from '../../src/enums/OrderStatus';
import { EventType } from '../../src/events/EventType';
import { createOrder } from '../../src/routes/createOrder';
import { createOrderInputMock, orderProductMock, userMock } from '../mocks/create-order';
import { mockDataSource } from '../mocks/dataSource';
import { mockOrderRepo } from '../mocks/order';
import { mockOrderItemRepo } from '../mocks/orderItem';
import { mockProductRepo } from '../mocks/product';
import { mockRedis } from '../mocks/redis';
import { mockUserRepo } from '../mocks/user';

jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('create order', () => {
  let users: ReturnType<typeof mockUserRepo>;
  let products: ReturnType<typeof mockProductRepo>;
  let orders: ReturnType<typeof mockOrderRepo>;
  let items: ReturnType<typeof mockOrderItemRepo>;
  let redis: ReturnType<typeof mockRedis>;
  let dataSource: ReturnType<typeof mockDataSource>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('id-1')
      .mockReturnValueOnce('id-2')
      .mockReturnValueOnce('id-3');
    users = mockUserRepo({ findOne: userMock });
    products = mockProductRepo({ find: [orderProductMock] });
    orders = mockOrderRepo();
    items = mockOrderItemRepo();
    redis = mockRedis();
    dataSource = mockDataSource({
      user: users,
      product: products,
      order: orders,
      orderItem: items,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('saves order and items and requests publication of OrderCreated', async () => {
      const order = await createOrder(dataSource, redis, createOrderInputMock);

      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.total).toBe(30);
      expect(orders.save).toHaveBeenCalledWith(order);
      expect(items.save).toHaveBeenCalledWith(order.items);
      const fields = (redis.xadd as jest.Mock).mock.calls[0];
      const eventFields = Object.fromEntries(
        Array.from({ length: (fields.length - 2) / 2 }, (_, index) => [
          fields[2 + index * 2],
          fields[3 + index * 2],
        ]),
      );
      expect(eventFields.event).toBe(EventType.OrderCreated);
      expect(JSON.parse(eventFields.payload as string)).toMatchObject({
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
      await expect(
        createOrder(dataSource, redis, { userId: 'user-1', items: [] }),
      ).rejects.toBeInstanceOf(EmptyOrderItemsError);
      expect(orders.save).not.toHaveBeenCalled();
    });

    it('rejects items that are not an array', async () => {
      await expect(
        createOrder(dataSource, redis, { userId: 'user-1', items: {} }),
      ).rejects.toBeInstanceOf(EmptyOrderItemsError);
      expect(orders.save).not.toHaveBeenCalled();
    });

    it('rejects invalid quantities', async () => {
      await expect(
        createOrder(dataSource, redis, {
          userId: 'user-1',
          items: [{ productId: 'product-1', quantity: 0 }],
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('rejects missing user', async () => {
      users.findOne.mockResolvedValue(null);
      await expect(
        createOrder(dataSource, redis, {
          userId: 'missing',
          items: [{ productId: 'product-1', quantity: 1 }],
        }),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it('rejects missing product', async () => {
      products.find.mockResolvedValue([]);
      await expect(
        createOrder(dataSource, redis, {
          userId: 'user-1',
          items: [{ productId: 'missing', quantity: 1 }],
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('checks aggregate stock for duplicate products', async () => {
      await expect(
        createOrder(dataSource, redis, {
          userId: 'user-1',
          items: [
            { productId: 'product-1', quantity: 6 },
            { productId: 'product-1', quantity: 5 },
          ],
        }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(redis.xadd).not.toHaveBeenCalled();
    });
  });
});
