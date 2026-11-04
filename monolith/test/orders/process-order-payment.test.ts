import { OrderStatus } from '../../src/enums/OrderStatus';
import { OrderPaymentStatus } from '../../src/enums/OrderPaymentStatus';
import { PaymentToken } from '../../src/enums/PaymentToken';
import {
  orderId,
  transactionId,
  eventId,
  idempotencyKey,
  otherIdempotencyKey,
  createdAt,
  paidAt,
  orderMock,
  paymentMock,
  attemptMock,
} from '../mocks/process-order-payment';
import {
  InvalidOrderIdError,
  InvalidPaymentTokenError,
  InvalidIdempotencyKeyError,
  OrderNotFoundError,
  PaymentNotReadyError,
  InvalidOrderPaymentStateError,
  PaymentAttemptConflictError,
} from '../../src/errors';
import { v4 as uuidv4 } from 'uuid';
import { processOrderPayment } from '../../src/routes/processOrderPayment';
import { mockDataSource } from '../mocks/dataSource';
import { mockOrderRepo } from '../mocks/order';
import { mockOrderPaymentRepo } from '../mocks/orderPayment';
import { mockOrderPaymentAttemptRepo } from '../mocks/orderPaymentAttempt';
import { mockRedis } from '../mocks/redis';
jest.mock('uuid', () => ({ v4: jest.fn() }));

function fixture(
  order = orderMock() as ReturnType<typeof orderMock> | null,
  payment = paymentMock() as ReturnType<typeof paymentMock> | null,
  existingAttempt: ReturnType<typeof attemptMock> | null = null,
) {
  const orders = mockOrderRepo({ findOne: order });
  const payments = mockOrderPaymentRepo({ findOne: payment });
  const attempts = mockOrderPaymentAttemptRepo({ findOne: existingAttempt });
  const redis = mockRedis();
  const ds = mockDataSource({
    order: orders,
    orderPayment: payments,
    orderPaymentAttempt: attempts,
  });
  const ids = (uuidv4 as jest.Mock).mockReset().mockReturnValueOnce(transactionId).mockReturnValueOnce(eventId);
  const fields = () => {
    const args = (redis.xadd as jest.Mock).mock.calls[0];
    return Object.fromEntries(
      Array.from({ length: (args.length - 2) / 2 }, (_, i) => [args[2 + i * 2], args[3 + i * 2]]),
    );
  };
  return {
    invoke: (
      id: unknown = orderId,
      ...rest: [token?: unknown, key?: unknown]
    ) =>
      processOrderPayment(
        ds,
        redis,
        id,
        rest.length > 0 ? rest[0] : PaymentToken.APPROVED,
        rest.length > 1 ? rest[1] : idempotencyKey,
      ),
    findOrder: orders.findOne,
    savePayment: payments.save,
    saveAttempt: attempts.save,
    findAttempt: attempts.findOne,
    publish: redis.xadd as jest.Mock,
    ids,
    payload: () => JSON.parse(fields().payload as string),
    eventType: () => fields().event,
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
    it('approves the first attempt and publishes PaymentApproved', async () => {
      const order = orderMock();
      const f = fixture(order, paymentMock(OrderPaymentStatus.PENDING), null);
      const result = await f.invoke(orderId, PaymentToken.APPROVED, idempotencyKey);
      expect(result).toMatchObject({
        status: OrderPaymentStatus.PAID,
        createdAt,
        paidAt,
        paymentDetails: { provider: 'simulated', transactionId, amount: 250 },
      });
      expect(f.saveAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 1, token: PaymentToken.APPROVED }),
      );
      expect(f.savePayment).toHaveBeenCalledTimes(1);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.eventType()).toBe('PaymentApproved');
      expect(f.payload()).toMatchObject({ orderId, transactionId, amount: 250 });
    });
    it('declines the first attempt, keeps the order pending and does not publish yet', async () => {
      const f = fixture(orderMock(), paymentMock(OrderPaymentStatus.PENDING), null);
      const result = await f.invoke(orderId, PaymentToken.DECLINED, idempotencyKey);
      expect(result).toMatchObject({
        status: OrderPaymentStatus.DECLINED_RETRY,
        paidAt: null,
        paymentDetails: { provider: 'simulated', transactionId, amount: 250 },
      });
      expect(f.saveAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 1, token: PaymentToken.DECLINED }),
      );
      expect(f.savePayment).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderPaymentStatus.DECLINED_RETRY }),
      );
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('approves the second attempt after a first decline', async () => {
      const f = fixture(orderMock(), paymentMock(OrderPaymentStatus.DECLINED_RETRY), null);
      const result = await f.invoke(orderId, PaymentToken.APPROVED, otherIdempotencyKey);
      expect(result.status).toBe(OrderPaymentStatus.PAID);
      expect(f.saveAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 2, token: PaymentToken.APPROVED }),
      );
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.eventType()).toBe('PaymentApproved');
    });
    it('declines the second attempt as final and publishes PaymentDeclinedError', async () => {
      const f = fixture(orderMock(), paymentMock(OrderPaymentStatus.DECLINED_RETRY), null);
      const result = await f.invoke(orderId, PaymentToken.DECLINED, otherIdempotencyKey);
      expect(result.status).toBe(OrderPaymentStatus.DECLINED);
      expect(f.saveAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 2, token: PaymentToken.DECLINED }),
      );
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.eventType()).toBe('PaymentDeclinedError');
    });
    it('repeats the result of the first key without creating a new attempt', async () => {
      const existing = attemptMock(OrderPaymentStatus.DECLINED, PaymentToken.DECLINED, 1, idempotencyKey);
      const f = fixture(orderMock(), paymentMock(OrderPaymentStatus.DECLINED_RETRY), existing);
      const result = await f.invoke(orderId, PaymentToken.DECLINED, idempotencyKey);
      expect(result).toMatchObject({ status: OrderPaymentStatus.DECLINED_RETRY });
      expect(f.saveAttempt).not.toHaveBeenCalled();
      expect(f.savePayment).not.toHaveBeenCalled();
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
      'rejects invalid Idempotency-Key %s',
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
    it('rejects a conflicting retry with the same key and a different token', async () => {
      const existing = attemptMock(OrderPaymentStatus.DECLINED_RETRY, PaymentToken.DECLINED, 1, idempotencyKey);
      const f = fixture(orderMock(), paymentMock(OrderPaymentStatus.DECLINED_RETRY), existing);
      await expect(
        f.invoke(orderId, PaymentToken.APPROVED, idempotencyKey),
      ).rejects.toBeInstanceOf(PaymentAttemptConflictError);
      expect(f.saveAttempt).not.toHaveBeenCalled();
      expect(f.savePayment).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it.each([
      [OrderPaymentStatus.PENDING, OrderStatus.PENDING],
      [OrderPaymentStatus.PENDING, OrderStatus.CANCELED],
      [OrderPaymentStatus.DECLINED_RETRY, OrderStatus.CANCELED],
      [OrderPaymentStatus.PAID, OrderStatus.PAYMENT_PENDING],
      [OrderPaymentStatus.DECLINED, OrderStatus.PAYMENT_PENDING],
    ])('rejects incompatible payment %s and order %s', async (paymentStatus, orderStatus) => {
      const f = fixture(orderMock(orderStatus), paymentMock(paymentStatus));
      await expect(f.invoke(orderId, PaymentToken.APPROVED, idempotencyKey)).rejects.toBeInstanceOf(
        InvalidOrderPaymentStateError,
      );
      expect(f.saveAttempt).not.toHaveBeenCalled();
      expect(f.savePayment).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
  });
});
