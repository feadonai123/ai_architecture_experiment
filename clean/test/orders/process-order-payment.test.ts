import { OrderStatus } from '../../src/entities/OrderStatus';
import { OrderPaymentStatus } from '../../src/entities/OrderPaymentStatus';
import { PaymentToken } from '../../src/entities/PaymentToken';
import {
  orderId,
  transactionId,
  eventId,
  createdAt,
  paidAt,
  orderMock,
  paymentMock,
} from '../mocks/process-order-payment';
import { InvalidOrderIdError } from '../../src/errors/InvalidOrderIdError';
import { InvalidPaymentTokenError } from '../../src/errors/InvalidPaymentTokenError';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { PaymentNotReadyError } from '../../src/errors/PaymentNotReadyError';
import { InvalidOrderPaymentStateError } from '../../src/errors/InvalidOrderPaymentStateError';
import { ProcessOrderPayment } from '../../src/usecases/ProcessOrderPayment';
import { mockOrderRepository } from '../mocks/orderRepository';
import { mockOrderPaymentRepository } from '../mocks/orderPaymentRepository';
import { mockEventService } from '../mocks/eventService';
import { mockClock } from '../mocks/clock';
import { mockPaymentIds } from '../mocks/paymentIds';

function fixture(
  order = orderMock() as ReturnType<typeof orderMock> | null,
  payment = paymentMock() as ReturnType<typeof paymentMock> | null,
) {
  const orders = mockOrderRepository(order);
  const payments = mockOrderPaymentRepository(payment);
  const events = mockEventService();
  const ids = mockPaymentIds(transactionId, eventId);
  const useCase = new ProcessOrderPayment(
    orders,
    payments,
    events,
    ids,
    mockClock(paidAt.toISOString()),
  );
  return {
    invoke: (id: unknown = orderId, ...tokens: unknown[]) =>
      useCase.run(id, tokens.length ? tokens[0] : PaymentToken.APPROVED),
    findOrder: orders.findByIdForUpdate,
    save: payments.update,
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
