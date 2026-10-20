import { Order } from '../../src/entities/Order';
import { OrderPayment } from '../../src/entities/OrderPayment';
import { OrderPaymentStatus } from '../../src/entities/OrderPaymentStatus';
import { OrderStatus } from '../../src/entities/OrderStatus';

export function orderMock(): Order {
  return new Order(
    'order-1',
    'user-1',
    OrderStatus.PENDING,
    20,
    new Date('2026-01-01T00:00:00.000Z'),
    [],
  );
}

export function existingPaymentMock(): OrderPayment {
  return new OrderPayment(
    'order-1',
    OrderPaymentStatus.PENDING,
    null,
    null,
    new Date('2026-01-01T00:00:00.000Z'),
  );
}
