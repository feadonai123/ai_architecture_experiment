import { Order } from '../../src/shared/entities/Order';
import { OrderStatus } from '../../src/shared/entities/OrderStatus';
export const orderId = '0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f';
export function orderMock(status = OrderStatus.PENDING): Order {
  return {
    id: orderId,
    userId: '25ec38d4-8b61-459d-93b3-78a1d8d0daf9',
    status,
    total: 250,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    items: [],
  } as Order;
}
