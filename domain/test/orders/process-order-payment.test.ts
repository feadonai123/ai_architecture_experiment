import { OrderStatus } from '../../src/shared/entities/OrderStatus';
import { OrderPaymentStatus } from '../../src/shared/entities/OrderPaymentStatus';
import { PaymentToken } from '../../src/shared/entities/PaymentToken';
import {
  orderId,
  idempotencyKey,
  otherIdempotencyKey,
  transactionId,
  eventId,
  createdAt,
  paidAt,
  orderMock,
  paymentMock,
  attemptMock,
} from '../mocks/process-order-payment';
import { InvalidOrderIdError } from '../../src/payments/processOrderPayment/errors/InvalidOrderIdError';
import { InvalidPaymentTokenError } from '../../src/payments/processOrderPayment/errors/InvalidPaymentTokenError';
import { InvalidIdempotencyKeyError } from '../../src/payments/processOrderPayment/errors/InvalidIdempotencyKeyError';
import { OrderNotFoundError } from '../../src/payments/processOrderPayment/errors/OrderNotFoundError';
import { PaymentNotReadyError } from '../../src/payments/processOrderPayment/errors/PaymentNotReadyError';
import { PaymentAttemptConflictError } from '../../src/payments/processOrderPayment/errors/PaymentAttemptConflictError';
import { InvalidOrderPaymentStateError } from '../../src/payments/processOrderPayment/errors/InvalidOrderPaymentStateError';
import { ProcessOrderPayment } from '../../src/payments/processOrderPayment/usecases/ProcessOrderPayment';
import { mockOrderRepository } from '../mocks/orderRepository';
import { mockOrderPaymentRepository } from '../mocks/orderPaymentRepository';
import { mockOrderPaymentAttemptRepository } from '../mocks/orderPaymentAttemptRepository';
import { mockEventService } from '../mocks/eventService';
import { mockClock } from '../mocks/clock';
import { mockPaymentIds } from '../mocks/paymentIds';

function fixture(
  options: {
    order?: ReturnType<typeof orderMock> | null;
    payment?: ReturnType<typeof paymentMock> | null;
    existingAttempt?: ReturnType<typeof attemptMock> | null;
    attemptsCount?: number;
  } = {},
) {
  const order = 'order' in options ? options.order : orderMock();
  const payment = 'payment' in options ? options.payment : paymentMock();
  const orders = mockOrderRepository(order ?? null);
  const payments = mockOrderPaymentRepository(payment ?? null);
  const attempts = mockOrderPaymentAttemptRepository({
    existing: options.existingAttempt ?? null,
    count: options.attemptsCount ?? 0,
  });
  const events = mockEventService();
  const ids = mockPaymentIds(transactionId, eventId);
  const useCase = new ProcessOrderPayment(
    orders,
    payments,
    attempts,
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
    createAttempt: attempts.create,
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
    it('persists the first attempt as approved and publishes PaymentApproved', async () => {
      const order = orderMock();
      const f = fixture({ order });
      const result = await f.invoke(orderId, PaymentToken.APPROVED);
      expect(result).toMatchObject({
        status: OrderPaymentStatus.PAID,
        createdAt,
        paidAt,
        paymentDetails: { provider: 'simulated', transactionId, amount: 250 },
      });
      expect(order.status).toBe(OrderStatus.PAYMENT_PENDING);
      expect(f.createAttempt).toHaveBeenCalledTimes(1);
      expect(f.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 1, paymentToken: PaymentToken.APPROVED }),
      );
      expect(f.save).toHaveBeenCalledTimes(1);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.payload()).toMatchObject({ orderId, transactionId, amount: 250 });
      expect(f.eventType()).toBe('PaymentApproved');
    });
    it('persists a first decline without updating the payment or publishing an event', async () => {
      const f = fixture();
      const result = await f.invoke(orderId, PaymentToken.DECLINED);
      expect(result).toMatchObject({
        status: OrderPaymentStatus.DECLINED,
        paidAt: null,
        paymentDetails: { provider: 'simulated', transactionId, amount: 250 },
      });
      expect(f.createAttempt).toHaveBeenCalledTimes(1);
      expect(f.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 1, paymentToken: PaymentToken.DECLINED }),
      );
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('approves the second attempt after a first decline', async () => {
      const f = fixture({ attemptsCount: 1 });
      const result = await f.invoke(orderId, PaymentToken.APPROVED, otherIdempotencyKey);
      expect(result).toMatchObject({ status: OrderPaymentStatus.PAID, paidAt });
      expect(f.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 2, paymentToken: PaymentToken.APPROVED }),
      );
      expect(f.save).toHaveBeenCalledTimes(1);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.eventType()).toBe('PaymentApproved');
    });
    it('declines the second attempt definitively and publishes PaymentDeclinedError', async () => {
      const f = fixture({ attemptsCount: 1 });
      const result = await f.invoke(orderId, PaymentToken.DECLINED, otherIdempotencyKey);
      expect(result).toMatchObject({ status: OrderPaymentStatus.DECLINED, paidAt: null });
      expect(f.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 2, paymentToken: PaymentToken.DECLINED }),
      );
      expect(f.save).toHaveBeenCalledTimes(1);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.eventType()).toBe('PaymentDeclinedError');
    });
    it('replays the original result for a repeated key with the same token', async () => {
      const existingAttempt = attemptMock({ paymentToken: PaymentToken.DECLINED, attemptNumber: 1 });
      const f = fixture({ existingAttempt });
      const result = await f.invoke(orderId, PaymentToken.DECLINED);
      expect(result).toMatchObject({
        status: existingAttempt.status,
        paymentDetails: existingAttempt.paymentDetails,
        paidAt: existingAttempt.paidAt,
      });
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
      expect(f.ids).not.toHaveBeenCalled();
    });
    it('replays the original approval even after the order already left PAYMENT_PENDING', async () => {
      const existingAttempt = attemptMock({
        paymentToken: PaymentToken.APPROVED,
        status: OrderPaymentStatus.PAID,
        paidAt,
      });
      const f = fixture({
        order: orderMock(OrderStatus.PAID),
        payment: paymentMock(OrderPaymentStatus.PAID),
        existingAttempt,
      });
      const result = await f.invoke(orderId, PaymentToken.APPROVED);
      expect(result).toMatchObject({ status: OrderPaymentStatus.PAID, paidAt });
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
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
    it.each([undefined, null, '', 42, 'not-a-uuid'])(
      'rejects invalid idempotency key %s',
      async (key) => {
        const f = fixture();
        await expect(f.invoke(orderId, PaymentToken.APPROVED, key)).rejects.toBeInstanceOf(
          InvalidIdempotencyKeyError,
        );
        expect(f.findOrder).not.toHaveBeenCalled();
        expect(f.createAttempt).not.toHaveBeenCalled();
        expect(f.publish).not.toHaveBeenCalled();
      },
    );
    it('rejects missing order', async () => {
      const f = fixture({ order: null });
      await expect(f.invoke()).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('rejects payment not ready', async () => {
      const f = fixture({ payment: null });
      await expect(f.invoke()).rejects.toBeInstanceOf(PaymentNotReadyError);
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('rejects a repeated key sent with a different token', async () => {
      const existingAttempt = attemptMock({ paymentToken: PaymentToken.DECLINED });
      const f = fixture({ existingAttempt });
      await expect(f.invoke(orderId, PaymentToken.APPROVED)).rejects.toBeInstanceOf(
        PaymentAttemptConflictError,
      );
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('rejects a new key once the payment was already approved', async () => {
      const f = fixture({ payment: paymentMock(OrderPaymentStatus.PAID), attemptsCount: 1 });
      await expect(
        f.invoke(orderId, PaymentToken.DECLINED, otherIdempotencyKey),
      ).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('rejects a new key once the payment was already declined definitively, even while the order is still pending', async () => {
      const f = fixture({
        order: orderMock(OrderStatus.PAYMENT_PENDING),
        payment: paymentMock(OrderPaymentStatus.DECLINED),
        attemptsCount: 2,
      });
      await expect(
        f.invoke(orderId, PaymentToken.APPROVED, otherIdempotencyKey),
      ).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('rejects a new key once two attempts were already made, even if the payment is still pending', async () => {
      const f = fixture({ attemptsCount: 2 });
      await expect(
        f.invoke(orderId, PaymentToken.APPROVED, otherIdempotencyKey),
      ).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it.each([OrderStatus.PENDING, OrderStatus.CANCELED, OrderStatus.PAID])(
      'rejects an order not in PAYMENT_PENDING %s',
      async (orderStatus) => {
        const f = fixture({ order: orderMock(orderStatus) });
        await expect(f.invoke()).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
        expect(f.createAttempt).not.toHaveBeenCalled();
        expect(f.publish).not.toHaveBeenCalled();
      },
    );
  });
});
