import { handleOrderCreated } from '../../src/consumers/consumerFinancial';
import { OrderNotFoundError } from '../../src/errors';
import { OrderPaymentStatus } from '../../src/enums/OrderPaymentStatus';
import { OrderStatus } from '../../src/enums/OrderStatus';
import { Logger } from '../../src/utils/Logger';
import {
  existingPaymentMock,
  orderCreatedPayloadMock,
  orderMock,
} from '../mocks/create-order-payment';
import { mockDataSource } from '../mocks/dataSource';
import { mockOrderRepo } from '../mocks/order';
import { mockOrderPaymentRepo } from '../mocks/orderPayment';

describe('create order payment', () => {
  let orders: ReturnType<typeof mockOrderRepo>;
  let payments: ReturnType<typeof mockOrderPaymentRepo>;
  let dataSource: ReturnType<typeof mockDataSource>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    orders = mockOrderRepo({ findOne: orderMock() });
    payments = mockOrderPaymentRepo();
    dataSource = mockDataSource({ order: orders, orderPayment: payments });
    jest.spyOn(Logger, 'info').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('creates pending payment and updates order status', async () => {
      await handleOrderCreated(dataSource, 'event-1', orderCreatedPayloadMock());

      expect(orders.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(payments.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          status: OrderPaymentStatus.PENDING,
          paymentDetails: null,
          paidAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      );
      expect(orders.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.PAYMENT_PENDING }),
      );
    });

    it('does nothing if payment already exists', async () => {
      payments.findOne.mockResolvedValue(existingPaymentMock());

      await handleOrderCreated(dataSource, 'event-1', orderCreatedPayloadMock());

      expect(payments.save).not.toHaveBeenCalled();
      expect(orders.save).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('rejects an unknown order', async () => {
      orders.findOne.mockResolvedValue(null);

      await expect(
        handleOrderCreated(dataSource, 'event-1', orderCreatedPayloadMock()),
      ).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(payments.save).not.toHaveBeenCalled();
    });

    it('rejects an empty order id before querying persistence', async () => {
      await expect(
        handleOrderCreated(dataSource, 'event-1', orderCreatedPayloadMock('')),
      ).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(orders.findOne).not.toHaveBeenCalled();
    });
  });
});
