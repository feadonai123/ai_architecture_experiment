import { OrderStatus } from '../../src/entities/OrderStatus';
import { orderId, orderMock } from '../mocks/payment-declined';
import { CancelOrderPayment } from '../../src/usecases/CancelOrderPayment';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { InvalidOrderPaymentStateError } from '../../src/errors/InvalidOrderPaymentStateError';
import { mockOrderRepository } from '../mocks/orderRepository';

function fixture(order = orderMock() as ReturnType<typeof orderMock> | null) {
  const orders = mockOrderRepository(order);
  const useCase = new CancelOrderPayment(orders);
  return { invoke: () => useCase.run(orderId), save: orders.update };
}
describe('cancelOrderPayment', () => {
  afterEach(() => jest.restoreAllMocks());
  describe('success', () => {
    it('updates the pending order', async () => {
      const f = fixture();
      await f.invoke();
      expect(f.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELED }),
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
