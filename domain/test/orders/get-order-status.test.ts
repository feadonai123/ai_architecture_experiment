import { OrderStatus } from '../../src/shared/entities/OrderStatus';
import { orderId, orderMock } from '../mocks/get-order-status';
import { InvalidOrderIdError } from '../../src/ordering/getOrderStatus/errors/InvalidOrderIdError';
import { OrderNotFoundError } from '../../src/ordering/getOrderStatus/errors/OrderNotFoundError';
import { GetOrderStatus } from '../../src/ordering/getOrderStatus/usecases/GetOrderStatus';
import { mockOrderRepository } from '../mocks/orderRepository';
function fixture(order: ReturnType<typeof orderMock> | null = orderMock()) {
  const orders = mockOrderRepository(order);
  const useCase = new GetOrderStatus(orders);
  return { invoke: (id: unknown) => useCase.run(id), find: orders.findById };
}

describe('get order status', () => {
  afterEach(() => jest.restoreAllMocks());
  describe('success', () => {
    it.each([
      OrderStatus.PENDING,
      OrderStatus.PAYMENT_PENDING,
      OrderStatus.PAID,
      OrderStatus.CANCELED,
    ])('returns persisted status %s', async (status) => {
      const order = orderMock(status);
      const f = fixture(order);
      expect(await f.invoke(orderId)).toEqual(order);
      expect(f.find).toHaveBeenCalledWith(orderId);
    });
  });
  describe('errors', () => {
    it.each([undefined, null, 123, '', 'invalid', '00000000-0000-0000-0000-000000000000'])(
      'rejects invalid UUID %s before reading',
      async (id) => {
        const f = fixture();
        await expect(f.invoke(id)).rejects.toThrow(new InvalidOrderIdError(id));
        expect(f.find).not.toHaveBeenCalled();
      },
    );
    it('rejects an unknown order', async () => {
      const f = fixture(null);
      await expect(f.invoke(orderId)).rejects.toThrow(new OrderNotFoundError(orderId));
    });
  });
});
