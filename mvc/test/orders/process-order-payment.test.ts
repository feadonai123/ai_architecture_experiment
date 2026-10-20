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
import { InvalidOrderIdError } from '../../src/errors/InvalidOrderIdError';
import { InvalidPaymentTokenError } from '../../src/errors/InvalidPaymentTokenError';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { PaymentNotReadyError } from '../../src/errors/PaymentNotReadyError';
import { InvalidOrderPaymentStateError } from '../../src/errors/InvalidOrderPaymentStateError';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { processPayment } from '../../src/controllers/order/routes/processPayment.route';
import { setDataSource } from '../../src/database';
import { mockOrderFindByIdForUpdate } from '../mocks/order';
import { mockOrderPaymentFindByOrderId, mockOrderPaymentUpdate } from '../mocks/orderPayment';
import { mockPaymentPublish } from '../mocks/paymentEvents';
import { mockPaymentTransaction } from '../mocks/paymentTransaction';
jest.mock('uuid', () => ({ v4: jest.fn() }));

function fixture(
  order = orderMock() as ReturnType<typeof orderMock> | null,
  payment = paymentMock() as ReturnType<typeof paymentMock> | null,
) {
  const findOrder = mockOrderFindByIdForUpdate(order);
  mockOrderPaymentFindByOrderId(payment);
  const save = mockOrderPaymentUpdate();
  const publish = mockPaymentPublish();
  setDataSource(mockPaymentTransaction());
  const ids = (uuidv4 as jest.Mock)
    .mockReset()
    .mockReturnValueOnce(transactionId)
    .mockReturnValueOnce(eventId);
  return {
    invoke: async (id: unknown = orderId, ...tokens: unknown[]) => {
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
          body: { paymentToken: tokens.length ? tokens[0] : PaymentToken.APPROVED },
        } as unknown as Request,
        response as unknown as Response,
        (error) => {
          failure = error;
        },
      );
      if (failure) throw failure;
      expect(status).toBe(payment!.status === OrderPaymentStatus.DECLINED ? 422 : 200);
      if (status === 200)
        expect(body).toMatchObject({
          orderId,
          status: payment!.status,
          paymentDetails: payment!.paymentDetails,
          paidAt: payment!.paidAt!.toISOString(),
          createdAt: payment!.createdAt.toISOString(),
        });
      else expect(body).toMatchObject({ error: 'PaymentDeclinedError', statusCode: 422 });
      return payment!;
    },
    findOrder,
    save,
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
