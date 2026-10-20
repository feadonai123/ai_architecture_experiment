import { OrderStatus } from '../../src/enums/OrderStatus';
import { orderMock, payloadMock, eventId } from '../mocks/payment-declined';
import { OrderConsumer } from '../../src/consumers/OrderConsumer';
import { EventType } from '../../src/events/EventType';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { InvalidOrderPaymentStateError } from '../../src/errors/InvalidOrderPaymentStateError';
import { setDataSource } from '../../src/database';
import { mockOrderFindByIdForUpdate, mockOrderUpdate } from '../mocks/order';
import { mockConsumerRedis } from '../mocks/redis';
import { mockOrderConsumerConfig } from '../mocks/consumer';
import { mockPaymentTransaction } from '../mocks/paymentTransaction';

function fixture(order = orderMock() as ReturnType<typeof orderMock> | null) {
  mockOrderFindByIdForUpdate(order);
  const save = mockOrderUpdate();
  setDataSource(mockPaymentTransaction());
  const consumer = new OrderConsumer(mockConsumerRedis(), mockOrderConsumerConfig());
  return {
    invoke: () =>
      (
        consumer as unknown as {
          processEvent(type: EventType, id: string, payload: string): Promise<void>;
        }
      ).processEvent(EventType.PaymentDeclinedError, eventId, JSON.stringify(payloadMock)),
    save,
  };
}
describe('cancelOrderPayment', () => {
  afterEach(() => jest.restoreAllMocks());
  describe('success', () => {
    it('updates the pending order', async () => {
      const f = fixture();
      await f.invoke();
      expect(f.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELED }),
        expect.any(Object),
      );
    });
    it('ignores duplicate delivery', async () => {
      const f = fixture(orderMock(OrderStatus.CANCELED));
      await f.invoke();
      expect(f.save).not.toHaveBeenCalled();
    });
  });
  describe('errors', () => {
    it('rejects an unknown order', async () => {
      const f = fixture(null);
      await expect(f.invoke()).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(f.save).not.toHaveBeenCalled();
    });
    it.each([OrderStatus.PENDING, OrderStatus.PAID])(
      'rejects incompatible status %s',
      async (status) => {
        const f = fixture(orderMock(status));
        await expect(f.invoke()).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
        expect(f.save).not.toHaveBeenCalled();
      },
    );
  });
});
