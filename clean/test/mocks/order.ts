import { Order } from '../../src/entities/Order';
import { OrderStatus } from '../../src/entities/OrderStatus';
import { Product } from '../../src/entities/Product';

export const orderMock = new Order(
  'order-1',
  'user-1',
  OrderStatus.PENDING,
  20,
  new Date('2026-01-01T00:00:00.000Z'),
  [],
);
export const orderProductMock = new Product('product-1', 'Tea', 10, 10);

export function mockOrderDependencies() {
  return {
    users: { exists: jest.fn().mockResolvedValue(true) },
    products: {
      findAll: jest.fn(),
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(orderProductMock),
    },
    orders: {
      create: jest.fn().mockResolvedValue(undefined),
      findByIdForUpdate: jest
        .fn()
        .mockResolvedValue(
          new Order(
            orderMock.id,
            orderMock.userId,
            OrderStatus.PENDING,
            orderMock.total,
            orderMock.createdAt,
            [],
          ),
        ),
      update: jest.fn().mockResolvedValue(undefined),
    },
    items: { create: jest.fn().mockResolvedValue(undefined) },
    payments: {
      findByOrderId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
    },
    events: { publishAfterCommit: jest.fn().mockResolvedValue(undefined) },
  };
}
