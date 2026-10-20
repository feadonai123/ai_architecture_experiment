import { mockProductRepository } from '../mocks/productRepository';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { OrderStatus } from '../../src/entities/OrderStatus';
import { orderId, orderMock, declinedProductMock } from '../mocks/payment-declined';
import { CancelOrderPayment } from '../../src/usecases/CancelOrderPayment';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { InvalidOrderPaymentStateError } from '../../src/errors/InvalidOrderPaymentStateError';
import { mockOrderRepository } from '../mocks/orderRepository';

function fixture(order = orderMock() as ReturnType<typeof orderMock> | null) {
  const orders = mockOrderRepository(order);
  const products = mockProductRepository({ findById: declinedProductMock() });
  const useCase = new CancelOrderPayment(orders, products);
  return { invoke: () => useCase.run(orderId), save: orders.update, products };
}
describe('cancelOrderPayment', () => {
  afterEach(() => jest.restoreAllMocks());
  describe('success', () => {
    it('cancels and restores stock only once on redelivery', async () => {
      const f = fixture();
      await f.invoke();
      await f.invoke();
      expect(f.products.save).toHaveBeenCalledTimes(1);
      expect(f.products.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'product-1', stock: 10 }),
      );
      expect(f.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELED }),
      );
    });
    it('ignores duplicate delivery', async () => {
      const f = fixture(orderMock(OrderStatus.CANCELED));
      await f.invoke();
      expect(f.save).not.toHaveBeenCalled();
      expect(f.products.save).not.toHaveBeenCalled();
    });
  });
  describe('errors', () => {
    it('rejects missing stock product without canceling the order', async () => {
      const f = fixture();
      f.products.findByIdForUpdate.mockResolvedValue(null);
      await expect(f.invoke()).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(f.save).not.toHaveBeenCalled();
      expect(f.products.save).not.toHaveBeenCalled();
    });
    it('rejects an unknown order', async () => {
      const f = fixture(null);
      await expect(f.invoke()).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(f.save).not.toHaveBeenCalled();
      expect(f.products.save).not.toHaveBeenCalled();
    });
    it.each([OrderStatus.PENDING, OrderStatus.PAID])(
      'rejects incompatible status %s',
      async (status) => {
        const f = fixture(orderMock(status));
        await expect(f.invoke()).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
        expect(f.save).not.toHaveBeenCalled();
        expect(f.products.save).not.toHaveBeenCalled();
      },
    );
  });
});
