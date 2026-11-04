import { Order } from '../../src/entities/Order';
import { OrderPayment } from '../../src/entities/OrderPayment';
import { OrderPaymentAttempt } from '../../src/entities/OrderPaymentAttempt';
import { OrderStatus } from '../../src/enums/OrderStatus';
import { OrderPaymentStatus } from '../../src/enums/OrderPaymentStatus';
import { PaymentProvider } from '../../src/enums/PaymentProvider';
import { PaymentToken } from '../../src/enums/PaymentToken';
export const orderId = '0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f';
export const transactionId = 'da16e5ce-82c4-441b-bd19-3ec6e6e2d4a1';
export const eventId = 'c049cce2-29f6-4c89-b3a1-3fe67501a928';
export const idempotencyKey = '2b7c3b2a-0a8f-4e3a-9f1e-6a0b1c2d3e4f';
export const otherIdempotencyKey = '7a1c4b8d-5e6f-4a2b-9c3d-1e2f3a4b5c6d';
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
export function attemptMock(
  status = OrderPaymentStatus.DECLINED,
  token: PaymentToken = PaymentToken.DECLINED,
  attemptNumber = 1,
  key = idempotencyKey,
): OrderPaymentAttempt {
  return {
    orderId,
    idempotencyKey: key,
    attemptNumber,
    token,
    status,
    paymentDetails: { provider: PaymentProvider.SIMULATED, transactionId, amount: 250 },
    paidAt: status === OrderPaymentStatus.PAID ? paidAt : null,
    createdAt,
  } as unknown as OrderPaymentAttempt;
}
