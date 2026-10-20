import { Order } from '../../src/shared/entities/Order';
import { OrderPayment } from '../../src/shared/entities/OrderPayment';
import { OrderStatus } from '../../src/shared/entities/OrderStatus';
import { OrderPaymentStatus } from '../../src/shared/entities/OrderPaymentStatus';
import { PaymentProvider } from '../../src/shared/entities/PaymentProvider';
export const orderId = '0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f';
export const transactionId = 'da16e5ce-82c4-441b-bd19-3ec6e6e2d4a1';
export const eventId = 'c049cce2-29f6-4c89-b3a1-3fe67501a928';
export const createdAt = new Date('2026-01-01T00:00:00.000Z');
export const paidAt = new Date('2026-01-01T00:01:00.000Z');
export function orderMock(status = OrderStatus.PAYMENT_PENDING): Order {
  return {
    id: orderId,
    userId: '25ec38d4-8b61-459d-93b3-78a1d8d0daf9',
    status,
    total: 250,
    createdAt,
    items: [],
  } as unknown as Order;
}
export function paymentMock(status = OrderPaymentStatus.PENDING): OrderPayment {
  return {
    orderId,
    status,
    paymentDetails:
      status === OrderPaymentStatus.PENDING
        ? null
        : { provider: PaymentProvider.SIMULATED, transactionId, amount: 250 },
    paidAt: status === OrderPaymentStatus.PAID ? paidAt : null,
    createdAt,
  } as OrderPayment;
}
export const payloadMock = { orderId, transactionId, amount: 250 };
