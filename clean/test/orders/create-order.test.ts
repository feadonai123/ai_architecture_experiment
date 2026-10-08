import { OrderStatus } from '../../src/entities/OrderStatus';
import { EmptyOrderItemsError } from '../../src/errors/EmptyOrderItemsError';
import { InsufficientStockError } from '../../src/errors/InsufficientStockError';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { UserNotFoundError } from '../../src/errors/UserNotFoundError';
import { EventType } from '../../src/events/EventType';
import { CreateOrder } from '../../src/usecases/CreateOrder';
import { orderProductMock } from '../data/create-order';
import { mockClock } from '../mocks/clock';
import { mockEventService } from '../mocks/eventService';
import { mockSequentialIdentifier } from '../mocks/identifier';
import { mockOrderItemRepository } from '../mocks/orderItemRepository';
import { mockOrderRepository } from '../mocks/orderRepository';
import { mockProductRepository } from '../mocks/productRepository';
import { mockUserRepository } from '../mocks/userRepository';

describe('create order', () => {
  let users: ReturnType<typeof mockUserRepository>;
  let products: ReturnType<typeof mockProductRepository>;
  let orders: ReturnType<typeof mockOrderRepository>;
  let items: ReturnType<typeof mockOrderItemRepository>;
  let events: ReturnType<typeof mockEventService>;
  let useCase: CreateOrder;
  beforeEach(() => {
    users = mockUserRepository();
    products = mockProductRepository({ findById: orderProductMock });
    orders = mockOrderRepository();
    items = mockOrderItemRepository();
    events = mockEventService();
    useCase = new CreateOrder(
      users,
      products,
      orders,
      items,
      events,
      mockSequentialIdentifier('id-'),
      mockClock('2026-01-01T00:00:00.000Z'),
    );
  });

  describe('success', () => {
    it('saves order and items and requests publication of OrderCreated', async () => {
      const order = await useCase.run({
        userId: 'user-1',
        items: [
          { productId: 'product-1', quantity: 1 },
          { productId: 'product-1', quantity: 2 },
        ],
      });
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.total).toBe(30);
      expect(orders.create).toHaveBeenCalledWith(order);
      expect(items.create).toHaveBeenCalledWith(order.items);
      const event = events.publishAfterCommit.mock.calls[0][0];
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
      await expect(useCase.run({ userId: 'user-1', items: [] })).rejects.toBeInstanceOf(
        EmptyOrderItemsError,
      );
      expect(orders.create).not.toHaveBeenCalled();
    });
    it('rejects items that are not an array', async () => {
      await expect(useCase.run({ userId: 'user-1', items: {} })).rejects.toBeInstanceOf(
        EmptyOrderItemsError,
      );
      expect(orders.create).not.toHaveBeenCalled();
    });
    it('rejects invalid quantities', async () => {
      await expect(
        useCase.run({ userId: 'user-1', items: [{ productId: 'product-1', quantity: 0 }] }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });
    it('rejects missing user', async () => {
      users.exists.mockResolvedValue(false);
      await expect(
        useCase.run({ userId: 'missing', items: [{ productId: 'product-1', quantity: 1 }] }),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });
    it('rejects missing product', async () => {
      products.findById.mockResolvedValue(null);
      await expect(
        useCase.run({ userId: 'user-1', items: [{ productId: 'missing', quantity: 1 }] }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });
    it('checks aggregate stock for duplicate products', async () => {
      await expect(
        useCase.run({
          userId: 'user-1',
          items: [
            { productId: 'product-1', quantity: 6 },
            { productId: 'product-1', quantity: 5 },
          ],
        }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(events.publishAfterCommit).not.toHaveBeenCalled();
    });
  });
});
