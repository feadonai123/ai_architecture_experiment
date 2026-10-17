import { Order } from '../../src/entities/Order';
import { OrderPayment } from '../../src/entities/OrderPayment';
import { OrderPaymentStatus } from '../../src/enums/OrderPaymentStatus';
import { OrderStatus } from '../../src/enums/OrderStatus';

export function orderMock(): Order {
  return {
    id: 'order-1',
    userId: 'user-1',
    status: OrderStatus.PENDING,
    total: 20,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    items: [],
  } as unknown as Order;
}

export function existingPaymentMock(): OrderPayment {
  return {
    orderId: 'order-1',
    status: OrderPaymentStatus.PENDING,
    paymentDetails: null,
    paidAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  } as OrderPayment;
}

export function orderCreatedPayloadMock(orderId: string = 'order-1') {
  return {
    orderId,
    userId: 'user-1',
    items: [],
  };
}
