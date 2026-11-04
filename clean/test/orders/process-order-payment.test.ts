import { OrderStatus } from '../../src/entities/OrderStatus';
import { OrderPaymentStatus } from '../../src/entities/OrderPaymentStatus';
import { PaymentToken } from '../../src/entities/PaymentToken';
import {
  orderId,
  transactionId,
  eventId,
  idempotencyKey,
  otherIdempotencyKey,
  paidAt,
  orderMock,
  paymentMock,
  attemptMock,
} from '../mocks/process-order-payment';
import { InvalidOrderIdError } from '../../src/errors/InvalidOrderIdError';
import { InvalidPaymentTokenError } from '../../src/errors/InvalidPaymentTokenError';
import { InvalidIdempotencyKeyError } from '../../src/errors/InvalidIdempotencyKeyError';
import { IdempotencyKeyConflictError } from '../../src/errors/IdempotencyKeyConflictError';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { PaymentNotReadyError } from '../../src/errors/PaymentNotReadyError';
import { InvalidOrderPaymentStateError } from '../../src/errors/InvalidOrderPaymentStateError';
import { ProcessOrderPayment } from '../../src/usecases/ProcessOrderPayment';
import { mockOrderRepository } from '../mocks/orderRepository';
import { mockOrderPaymentRepository } from '../mocks/orderPaymentRepository';
import { mockOrderPaymentAttemptRepository } from '../mocks/orderPaymentAttemptRepository';
import { mockEventService } from '../mocks/eventService';
import { mockClock } from '../mocks/clock';
import { mockPaymentIds } from '../mocks/paymentIds';
import { OrderPaymentAttempt } from '../../src/entities/OrderPaymentAttempt';

function fixture(
  order = orderMock() as ReturnType<typeof orderMock> | null,
  payment = paymentMock() as ReturnType<typeof paymentMock> | null,
  attempts: OrderPaymentAttempt[] = [],
) {
  const orders = mockOrderRepository(order);
  const payments = mockOrderPaymentRepository(payment);
  const attemptsRepo = mockOrderPaymentAttemptRepository(attempts);
  const events = mockEventService();
  const ids = mockPaymentIds(transactionId, eventId);
  const useCase = new ProcessOrderPayment(
    orders,
    payments,
    attemptsRepo,
    events,
    ids,
    mockClock(paidAt.toISOString()),
  );
  return {
    invoke: (
      id: unknown = orderId,
      ...rest: [token?: unknown, key?: unknown]
    ) =>
      useCase.run(
        id,
        rest.length >= 1 ? rest[0] : PaymentToken.APPROVED,
        rest.length >= 2 ? rest[1] : idempotencyKey,
      ),
    findOrder: orders.findByIdForUpdate,
    save: payments.update,
    createAttempt: attemptsRepo.create,
    publish: events.publishAfterCommit,
    ids,
    payload: () => events.publishAfterCommit.mock.calls[0][0].getPayload(),
    eventType: () => events.publishAfterCommit.mock.calls[0][0].getType(),
  };
}

describe('process order payment', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(paidAt);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('persists an approval on the first attempt and publishes PaymentApproved', async () => {
      const order = orderMock();
      const f = fixture(order);
      const result = await f.invoke(orderId, PaymentToken.APPROVED);
      expect(result).toMatchObject({
        status: OrderPaymentStatus.PAID,
        paidAt,
        paymentDetails: { provider: 'simulated', transactionId, amount: 250 },
      });
      expect(f.createAttempt).toHaveBeenCalledTimes(1);
      expect(f.createAttempt.mock.calls[0][0]).toMatchObject({
        attemptNumber: 1,
        idempotencyKey,
        paymentToken: PaymentToken.APPROVED,
        status: OrderPaymentStatus.PAID,
      });
      expect(f.save).toHaveBeenCalledTimes(1);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.payload()).toMatchObject({ orderId, transactionId, amount: 250 });
      expect(f.eventType()).toBe('PaymentApproved');
    });

    it('persists a first decline as retryable without publishing or finalizing', async () => {
      const order = orderMock();
      const f = fixture(order);
      const result = await f.invoke(orderId, PaymentToken.DECLINED);
      expect(result).toMatchObject({
        status: OrderPaymentStatus.DECLINED,
        paidAt: null,
        paymentDetails: { provider: 'simulated', transactionId, amount: 250 },
      });
      expect(f.createAttempt).toHaveBeenCalledTimes(1);
      expect(f.createAttempt.mock.calls[0][0]).toMatchObject({ attemptNumber: 1 });
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
      expect(order.status).toBe(OrderStatus.PAYMENT_PENDING);
    });

    it('approves on the second attempt after a first decline (second chance)', async () => {
      const order = orderMock();
      const firstAttempt = attemptMock({ idempotencyKey: otherIdempotencyKey, attemptNumber: 1 });
      const f = fixture(order, paymentMock(OrderPaymentStatus.PENDING), [firstAttempt]);
      const result = await f.invoke(orderId, PaymentToken.APPROVED, idempotencyKey);
      expect(result).toMatchObject({ status: OrderPaymentStatus.PAID, paidAt });
      expect(f.createAttempt.mock.calls[0][0]).toMatchObject({ attemptNumber: 2 });
      expect(f.save).toHaveBeenCalledTimes(1);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.eventType()).toBe('PaymentApproved');
    });

    it('finalizes as declined on the second attempt and publishes PaymentDeclinedError', async () => {
      const order = orderMock();
      const firstAttempt = attemptMock({ idempotencyKey: otherIdempotencyKey, attemptNumber: 1 });
      const f = fixture(order, paymentMock(OrderPaymentStatus.PENDING), [firstAttempt]);
      const result = await f.invoke(orderId, PaymentToken.DECLINED, idempotencyKey);
      expect(result).toMatchObject({ status: OrderPaymentStatus.DECLINED, paidAt: null });
      expect(f.createAttempt.mock.calls[0][0]).toMatchObject({ attemptNumber: 2 });
      expect(f.save).toHaveBeenCalledTimes(1);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.eventType()).toBe('PaymentDeclinedError');
    });

    it('replays the same idempotency key on a retryable (non-final) first decline', async () => {
      const order = orderMock();
      const attempt = attemptMock({ idempotencyKey, attemptNumber: 1, paymentToken: PaymentToken.DECLINED });
      const f = fixture(order, paymentMock(OrderPaymentStatus.PENDING), [attempt]);
      const result = await f.invoke(orderId, PaymentToken.DECLINED, idempotencyKey);
      expect(result).toMatchObject({ status: OrderPaymentStatus.DECLINED, paidAt: null });
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });

    it.each([
      [OrderPaymentStatus.PAID, OrderStatus.PAYMENT_PENDING],
      [OrderPaymentStatus.PAID, OrderStatus.PAID],
      [OrderPaymentStatus.DECLINED, OrderStatus.PAYMENT_PENDING],
      [OrderPaymentStatus.DECLINED, OrderStatus.CANCELED],
    ])('preserves final result %s with order %s', async (paymentStatus, orderStatus) => {
      const payment = paymentMock(paymentStatus);
      const attempts =
        paymentStatus === OrderPaymentStatus.PAID
          ? [attemptMock({ attemptNumber: 1, paymentToken: PaymentToken.APPROVED, status: OrderPaymentStatus.PAID, paidAt })]
          : [
              attemptMock({ attemptNumber: 1, paymentToken: PaymentToken.DECLINED }),
              attemptMock({ attemptNumber: 2, paymentToken: PaymentToken.DECLINED, idempotencyKey: otherIdempotencyKey }),
            ];
      const f = fixture(orderMock(orderStatus), payment, attempts);
      expect(
        await f.invoke(
          orderId,
          paymentStatus === OrderPaymentStatus.PAID ? PaymentToken.DECLINED : PaymentToken.APPROVED,
          '33333333-3333-4333-8333-333333333333',
        ),
      ).toMatchObject(payment);
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
      expect(f.ids).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('rejects invalid id before persistence', async () => {
      const f = fixture();
      await expect(f.invoke('invalid')).rejects.toBeInstanceOf(InvalidOrderIdError);
      expect(f.findOrder).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it.each([undefined, null, '', 42, 'unknown'])('rejects invalid token %s', async (token) => {
      const f = fixture();
      await expect(f.invoke(orderId, token)).rejects.toBeInstanceOf(InvalidPaymentTokenError);
      expect(f.findOrder).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it.each([undefined, null, '', 'not-a-uuid'])(
      'rejects invalid idempotency key %s',
      async (key) => {
        const f = fixture();
        await expect(f.invoke(orderId, PaymentToken.APPROVED, key)).rejects.toBeInstanceOf(
          InvalidIdempotencyKeyError,
        );
        expect(f.findOrder).not.toHaveBeenCalled();
        expect(f.publish).not.toHaveBeenCalled();
      },
    );
    it('rejects missing order', async () => {
      const f = fixture(null);
      await expect(f.invoke()).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('rejects payment not ready', async () => {
      const f = fixture(orderMock(), null);
      await expect(f.invoke()).rejects.toBeInstanceOf(PaymentNotReadyError);
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('rejects the same idempotency key reused with a different token (conflict)', async () => {
      const order = orderMock();
      const attempt = attemptMock({ idempotencyKey, attemptNumber: 1, paymentToken: PaymentToken.DECLINED });
      const f = fixture(order, paymentMock(OrderPaymentStatus.DECLINED), [attempt]);
      await expect(f.invoke(orderId, PaymentToken.APPROVED, idempotencyKey)).rejects.toBeInstanceOf(
        IdempotencyKeyConflictError,
      );
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('a brand-new key after exhaustion returns the final result without a third attempt', async () => {
      const order = orderMock();
      const payment = paymentMock(OrderPaymentStatus.DECLINED);
      const attempts = [
        attemptMock({ attemptNumber: 1, paymentToken: PaymentToken.DECLINED }),
        attemptMock({ attemptNumber: 2, paymentToken: PaymentToken.DECLINED, idempotencyKey: otherIdempotencyKey }),
      ];
      const f = fixture(order, payment, attempts);
      const result = await f.invoke(
        orderId,
        PaymentToken.APPROVED,
        '33333333-3333-4333-8333-333333333333',
      );
      expect(result).toMatchObject(payment);
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it.each([
      [OrderPaymentStatus.PENDING, OrderStatus.PENDING],
      [OrderPaymentStatus.PENDING, OrderStatus.CANCELED],
      [OrderPaymentStatus.PAID, OrderStatus.CANCELED],
      [OrderPaymentStatus.DECLINED, OrderStatus.PAID],
    ])('rejects incompatible payment %s and order %s', async (paymentStatus, orderStatus) => {
      const f = fixture(orderMock(orderStatus), paymentMock(paymentStatus));
      await expect(f.invoke()).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
  });
});
