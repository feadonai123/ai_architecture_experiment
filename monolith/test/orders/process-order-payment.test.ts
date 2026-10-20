import { OrderStatus } from '../../src/enums/OrderStatus';
import { OrderPaymentStatus } from '../../src/enums/OrderPaymentStatus';
import { PaymentToken } from '../../src/enums/PaymentToken';
import {
  orderId,
  transactionId,
  eventId,
  createdAt,
  paidAt,
  orderMock,
  paymentMock,
} from '../mocks/process-order-payment';
import {
  InvalidOrderIdError,
  InvalidPaymentTokenError,
  OrderNotFoundError,
  PaymentNotReadyError,
  InvalidOrderPaymentStateError,
} from '../../src/errors';
import { v4 as uuidv4 } from 'uuid';
import { processOrderPayment } from '../../src/routes/processOrderPayment';
import { mockDataSource } from '../mocks/dataSource';
import { mockOrderRepo } from '../mocks/order';
import { mockOrderPaymentRepo } from '../mocks/orderPayment';
import { mockRedis } from '../mocks/redis';
jest.mock('uuid', () => ({ v4: jest.fn() }));

function fixture(
  order = orderMock() as ReturnType<typeof orderMock> | null,
  payment = paymentMock() as ReturnType<typeof paymentMock> | null,
) {
  const orders = mockOrderRepo({ findOne: order });
  const payments = mockOrderPaymentRepo({ findOne: payment });
  const redis = mockRedis();
  const ds = mockDataSource({ order: orders, orderPayment: payments });
  const ids = (uuidv4 as jest.Mock)
    .mockReset()
    .mockReturnValueOnce(transactionId)
    .mockReturnValueOnce(eventId);
  const fields = () => {
    const args = (redis.xadd as jest.Mock).mock.calls[0];
    return Object.fromEntries(
      Array.from({ length: (args.length - 2) / 2 }, (_, i) => [args[2 + i * 2], args[3 + i * 2]]),
    );
  };
  return {
    invoke: (id: unknown = orderId, ...tokens: unknown[]) =>
      processOrderPayment(ds, redis, id, tokens.length ? tokens[0] : PaymentToken.APPROVED),
    findOrder: orders.findOne,
    save: payments.save,
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
    it.each([
      [PaymentToken.APPROVED, OrderPaymentStatus.PAID, 'PaymentApproved'],
      [PaymentToken.DECLINED, OrderPaymentStatus.DECLINED, 'PaymentDeclinedError'],
    ])('persists %s and publishes the corresponding event', async (token, status, type) => {
      const order = orderMock();
      const f = fixture(order);
      const result = await f.invoke(orderId, token);
      expect(result).toMatchObject({
        status,
        createdAt,
        paidAt: token === PaymentToken.APPROVED ? paidAt : null,
        paymentDetails: { provider: 'simulated', transactionId, amount: 250 },
      });
      expect(order.status).toBe(OrderStatus.PAYMENT_PENDING);
      expect(f.save).toHaveBeenCalledTimes(1);
      expect(f.publish).toHaveBeenCalledTimes(1);
      expect(f.payload()).toMatchObject({ orderId, transactionId, amount: 250 });
      expect(f.eventType()).toBe(type);
      expect(f.save.mock.invocationCallOrder[0]).toBeLessThan(
        f.publish.mock.invocationCallOrder[0],
      );
    });
    it.each([
      [OrderPaymentStatus.PAID, OrderStatus.PAYMENT_PENDING],
      [OrderPaymentStatus.PAID, OrderStatus.PAID],
      [OrderPaymentStatus.DECLINED, OrderStatus.PAYMENT_PENDING],
      [OrderPaymentStatus.DECLINED, OrderStatus.CANCELED],
    ])('preserves result %s with order %s', async (paymentStatus, orderStatus) => {
      const payment = paymentMock(paymentStatus);
      const f = fixture(orderMock(orderStatus), payment);
      expect(
        await f.invoke(
          orderId,
          paymentStatus === OrderPaymentStatus.PAID ? PaymentToken.DECLINED : PaymentToken.APPROVED,
        ),
      ).toMatchObject(payment);
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
