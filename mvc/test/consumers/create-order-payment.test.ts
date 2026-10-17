import { ConsumerFinancial } from '../../src/consumers/ConsumerFinancial';
import { setDataSource } from '../../src/database';
import { OrderPaymentStatus } from '../../src/enums/OrderPaymentStatus';
import { OrderStatus } from '../../src/enums/OrderStatus';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { EventType } from '../../src/events/EventType';
import { Logger } from '../../src/utils/Logger';
import {
  existingPaymentMock,
  orderCreatedPayloadMock,
  orderMock,
} from '../mocks/create-order-payment';
import { mockConsumerConfig } from '../mocks/consumer';
import { mockOrderFindByIdForUpdate, mockOrderUpdate } from '../mocks/order';
import {
  mockOrderPaymentCreate,
  mockOrderPaymentFindByOrderId,
} from '../mocks/orderPayment';
import { mockConsumerRedis } from '../mocks/redis';

function createOrderPayment(consumer: ConsumerFinancial, orderId: string): Promise<void> {
  return (
    consumer as unknown as {
      processEvent(type: EventType, eventId: string, payload: string): Promise<void>;
    }
  ).processEvent(EventType.OrderCreated, 'event-1', JSON.stringify(orderCreatedPayloadMock(orderId)));
}

describe('create order payment', () => {
  let orders: ReturnType<typeof mockOrderFindByIdForUpdate>;
  let updateOrder: ReturnType<typeof mockOrderUpdate>;
  let payments: ReturnType<typeof mockOrderPaymentFindByOrderId>;
  let createPayment: ReturnType<typeof mockOrderPaymentCreate>;
  let consumer: ConsumerFinancial;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    orders = mockOrderFindByIdForUpdate(orderMock());
    updateOrder = mockOrderUpdate();
    payments = mockOrderPaymentFindByOrderId(null);
    createPayment = mockOrderPaymentCreate();
    setDataSource({ transaction: jest.fn(async (run) => run({})) } as never);
    jest.spyOn(Logger, 'info').mockImplementation();
    consumer = new ConsumerFinancial(mockConsumerRedis(), mockConsumerConfig());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('creates pending payment and updates order status', async () => {
      await createOrderPayment(consumer, 'order-1');

      expect(orders).toHaveBeenCalledWith('order-1', expect.any(Object));
      expect(createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          status: OrderPaymentStatus.PENDING,
          paymentDetails: null,
          paidAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
        expect.any(Object),
      );
      expect(updateOrder).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.PAYMENT_PENDING }),
        expect.any(Object),
      );
    });

    it('does nothing if payment already exists', async () => {
      payments.mockResolvedValue(existingPaymentMock());

      await createOrderPayment(consumer, 'order-1');

      expect(createPayment).not.toHaveBeenCalled();
      expect(updateOrder).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('rejects an unknown order', async () => {
      orders.mockResolvedValue(null);

      await expect(createOrderPayment(consumer, 'order-1')).rejects.toBeInstanceOf(
        OrderNotFoundError,
      );
      expect(createPayment).not.toHaveBeenCalled();
    });

    it('rejects an empty order id before querying persistence', async () => {
      await expect(createOrderPayment(consumer, '')).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(orders).not.toHaveBeenCalled();
    });
  });
});
