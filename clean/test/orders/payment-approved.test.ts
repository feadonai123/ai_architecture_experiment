import { OrderStatus } from '../../src/entities/OrderStatus';
import { orderId, orderMock } from '../mocks/payment-approved';
import { ApproveOrderPayment } from '../../src/usecases/ApproveOrderPayment';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { InvalidOrderPaymentStateError } from '../../src/errors/InvalidOrderPaymentStateError';
import { mockOrderRepository } from '../mocks/orderRepository';

function fixture(order = orderMock() as ReturnType<typeof orderMock> | null) {
  const orders = mockOrderRepository(order);
  const useCase = new ApproveOrderPayment(orders);
  return { invoke: () => useCase.run(orderId), save: orders.update };
}
describe('approveOrderPayment', () => {
  afterEach(() => jest.restoreAllMocks());
  describe('success', () => {
    it('updates the pending order', async () => {
      const f = fixture();
      await f.invoke();
      expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ status: OrderStatus.PAID }));
    });
    it('ignores duplicate delivery', async () => {
      const f = fixture(orderMock(OrderStatus.PAID));
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
    it.each([OrderStatus.PENDING, OrderStatus.CANCELED])(
      'rejects incompatible status %s',
      async (status) => {
        const f = fixture(orderMock(status));
        await expect(f.invoke()).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
        expect(f.save).not.toHaveBeenCalled();
      },
    );
  });
});
