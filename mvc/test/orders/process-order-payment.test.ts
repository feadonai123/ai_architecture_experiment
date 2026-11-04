import { OrderStatus } from '../../src/enums/OrderStatus';
import { OrderPaymentStatus } from '../../src/enums/OrderPaymentStatus';
import { PaymentToken } from '../../src/enums/PaymentToken';
import {
  orderId,
  transactionId,
  eventId,
  idempotencyKey,
  paidAt,
  orderMock,
  paymentMock,
  attemptMock,
} from '../mocks/process-order-payment';
import { InvalidOrderIdError } from '../../src/errors/InvalidOrderIdError';
import { InvalidIdempotencyKeyError } from '../../src/errors/InvalidIdempotencyKeyError';
import { InvalidPaymentTokenError } from '../../src/errors/InvalidPaymentTokenError';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { PaymentNotReadyError } from '../../src/errors/PaymentNotReadyError';
import { PaymentAttemptConflictError } from '../../src/errors/PaymentAttemptConflictError';
import { InvalidOrderPaymentStateError } from '../../src/errors/InvalidOrderPaymentStateError';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { processPayment } from '../../src/controllers/order/routes/processPayment.route';
import { setDataSource } from '../../src/database';
import { mockOrderFindByIdForUpdate } from '../mocks/order';
import { mockOrderPaymentFindByOrderId, mockOrderPaymentUpdate } from '../mocks/orderPayment';
import {
  mockOrderPaymentAttemptFindByOrderAndKey,
  mockOrderPaymentAttemptCreate,
} from '../mocks/orderPaymentAttempt';
import { mockPaymentPublish } from '../mocks/paymentEvents';
import { mockPaymentTransaction } from '../mocks/paymentTransaction';
jest.mock('uuid', () => ({ v4: jest.fn() }));

const secondAttemptKey = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const defaultUuidQueue = [
  transactionId,
  eventId,
  'c9f1e3a0-1111-4a2b-8c3d-222233334444',
  'c9f1e3a0-5555-4a2b-8c3d-666677778888',
];

type InvokeOverrides = { id?: unknown; key?: unknown; token?: unknown };

function fixture(
  order = orderMock() as ReturnType<typeof orderMock> | null,
  payment = paymentMock() as ReturnType<typeof paymentMock> | null,
  existingAttempt: ReturnType<typeof attemptMock> | null = null,
  uuidQueue: string[] = defaultUuidQueue,
) {
  const findOrder = mockOrderFindByIdForUpdate(order);
  mockOrderPaymentFindByOrderId(payment);
  const save = mockOrderPaymentUpdate();
  mockOrderPaymentAttemptFindByOrderAndKey(existingAttempt);
  const createAttempt = mockOrderPaymentAttemptCreate();
  const publish = mockPaymentPublish();
  setDataSource(mockPaymentTransaction());
  const ids = (uuidv4 as jest.Mock).mockReset();
  for (const value of uuidQueue) ids.mockReturnValueOnce(value);
  return {
    invoke: async (overrides: InvokeOverrides = {}) => {
      const id = 'id' in overrides ? overrides.id : orderId;
      const key = 'key' in overrides ? overrides.key : idempotencyKey;
      const token = 'token' in overrides ? overrides.token : PaymentToken.APPROVED;
      let failure: unknown;
      let body: unknown;
      let status = 0;
      const response = {
        status: (value: number) => {
          status = value;
          return response;
        },
        json: (value: unknown) => {
          body = value;
        },
      };
      await processPayment(
        {
          params: { orderId: id },
          header: (name: string) => (name === 'Idempotency-Key' ? key : undefined),
          body: { paymentToken: token },
        } as unknown as Request,
        response as unknown as Response,
        (error) => {
          failure = error;
        },
      );
      if (failure) throw failure;
      return { status, body };
    },
    findOrder,
    save,
    createAttempt,
    publish,
    ids,
    payload: () => publish.mock.calls[0][0].getPayload(),
    eventType: () => publish.mock.calls[0][0].getType(),
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
    it('approves after a first declined attempt, keeping the order open until then', async () => {
      const order = orderMock();
      const payment = paymentMock(OrderPaymentStatus.PENDING, 0);
      const f = fixture(order, payment);
      const declined = await f.invoke({ key: idempotencyKey, token: PaymentToken.DECLINED });
      expect(declined.status).toBe(422);
      expect(declined.body).toMatchObject({ error: 'PaymentDeclinedError', statusCode: 422 });
      expect(payment.status).toBe(OrderPaymentStatus.PENDING);
      expect(payment.attempts).toBe(1);
      expect(f.publish).not.toHaveBeenCalled();
      const approved = await f.invoke({ key: secondAttemptKey, token: PaymentToken.APPROVED });
      expect(approved.status).toBe(200);
      expect(payment.status).toBe(OrderPaymentStatus.PAID);
      expect(payment.attempts).toBe(2);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.eventType()).toBe('PaymentApproved');
    });
    it('cancels after two declined attempts and publishes the definitive decline once', async () => {
      const order = orderMock();
      const payment = paymentMock(OrderPaymentStatus.PENDING, 0);
      const f = fixture(order, payment);
      const first = await f.invoke({ key: idempotencyKey, token: PaymentToken.DECLINED });
      expect(first.status).toBe(422);
      expect(f.publish).not.toHaveBeenCalled();
      expect(payment.status).toBe(OrderPaymentStatus.PENDING);
      const second = await f.invoke({ key: secondAttemptKey, token: PaymentToken.DECLINED });
      expect(second.status).toBe(422);
      expect(payment.status).toBe(OrderPaymentStatus.DECLINED);
      expect(payment.attempts).toBe(2);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.eventType()).toBe('PaymentDeclinedError');
    });
    it('persists approval on the first attempt and publishes the event', async () => {
      const order = orderMock();
      const payment = paymentMock(OrderPaymentStatus.PENDING, 0);
      const f = fixture(order, payment);
      const result = await f.invoke({ token: PaymentToken.APPROVED });
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        orderId,
        status: OrderPaymentStatus.PAID,
        paymentDetails: { provider: 'simulated', transactionId, amount: 250 },
        paidAt: paidAt.toISOString(),
      });
      expect(payment.status).toBe(OrderPaymentStatus.PAID);
      expect(payment.attempts).toBe(1);
      expect(f.save).toHaveBeenCalledTimes(1);
      expect(f.createAttempt).toHaveBeenCalledTimes(1);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.payload()).toMatchObject({ orderId, transactionId, amount: 250 });
      expect(f.eventType()).toBe('PaymentApproved');
    });
    it('repeats the exact result for a retried key with the same token, without reprocessing', async () => {
      const payment = paymentMock(OrderPaymentStatus.PAID, 1);
      const attempt = attemptMock({
        status: OrderPaymentStatus.PAID,
        paymentToken: PaymentToken.APPROVED,
        paidAt,
        paymentDetails: { provider: 'simulated', transactionId, amount: 250 },
      });
      const f = fixture(orderMock(OrderStatus.PAYMENT_PENDING), payment, attempt);
      const result = await f.invoke({ token: PaymentToken.APPROVED });
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        orderId,
        status: OrderPaymentStatus.PAID,
        paidAt: paidAt.toISOString(),
      });
      expect(f.save).not.toHaveBeenCalled();
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
      expect(f.ids).not.toHaveBeenCalled();
    });
    it('repeats a declined first-attempt result after the order moved on', async () => {
      const payment = paymentMock(OrderPaymentStatus.DECLINED, 2);
      const attempt = attemptMock();
      const f = fixture(orderMock(OrderStatus.CANCELED), payment, attempt);
      const result = await f.invoke({ token: PaymentToken.DECLINED });
      expect(result.status).toBe(422);
      expect(result.body).toEqual({
        error: 'PaymentDeclinedError',
        message: 'Payment declined for order: ' + orderId,
        statusCode: 422,
      });
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
  });
  describe('errors', () => {
    it('rejects invalid id before persistence', async () => {
      const f = fixture();
      await expect(f.invoke({ id: 'invalid' })).rejects.toBeInstanceOf(InvalidOrderIdError);
      expect(f.findOrder).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it.each([undefined, null, '', 42, 'not-a-uuid'])(
      'rejects invalid or missing Idempotency-Key %s',
      async (key) => {
        const f = fixture();
        await expect(f.invoke({ key })).rejects.toBeInstanceOf(InvalidIdempotencyKeyError);
        expect(f.findOrder).not.toHaveBeenCalled();
        expect(f.publish).not.toHaveBeenCalled();
      },
    );
    it.each([undefined, null, '', 42, 'unknown'])('rejects invalid token %s', async (token) => {
      const f = fixture();
      await expect(f.invoke({ token })).rejects.toBeInstanceOf(InvalidPaymentTokenError);
      expect(f.findOrder).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
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
    it('rejects a different valid token reused with the same key', async () => {
      const attempt = attemptMock({ paymentToken: PaymentToken.DECLINED });
      const f = fixture(orderMock(), paymentMock(OrderPaymentStatus.PENDING, 1), attempt);
      await expect(f.invoke({ token: PaymentToken.APPROVED })).rejects.toBeInstanceOf(
        PaymentAttemptConflictError,
      );
      expect(f.save).not.toHaveBeenCalled();
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('rejects a new key once the payment reached a definitive state', async () => {
      const f = fixture(orderMock(OrderStatus.PAID), paymentMock(OrderPaymentStatus.PAID, 1));
      await expect(f.invoke()).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
      expect(f.save).not.toHaveBeenCalled();
      expect(f.createAttempt).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it('rejects a new key once both attempts have been used', async () => {
      const f = fixture(orderMock(), paymentMock(OrderPaymentStatus.PENDING, 2));
      await expect(f.invoke()).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
      expect(f.save).not.toHaveBeenCalled();
      expect(f.publish).not.toHaveBeenCalled();
    });
    it.each([OrderStatus.PENDING, OrderStatus.CANCELED])(
      'rejects incompatible order status %s',
      async (orderStatus) => {
        const f = fixture(orderMock(orderStatus), paymentMock(OrderPaymentStatus.PENDING, 0));
        await expect(f.invoke()).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
        expect(f.save).not.toHaveBeenCalled();
        expect(f.publish).not.toHaveBeenCalled();
      },
    );
  });
});
