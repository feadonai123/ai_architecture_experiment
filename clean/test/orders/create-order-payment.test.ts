import { OrderPaymentStatus } from '../../src/entities/OrderPaymentStatus';
import { OrderStatus } from '../../src/entities/OrderStatus';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { CreateOrderPayment } from '../../src/usecases/CreateOrderPayment';
import { existingPaymentMock, orderMock } from '../data/create-order-payment';
import { mockClock } from '../mocks/clock';
import { mockOrderPaymentRepository } from '../mocks/orderPaymentRepository';
import { mockOrderRepository } from '../mocks/orderRepository';

describe('create order payment', () => {
  let orders: ReturnType<typeof mockOrderRepository>;
  let payments: ReturnType<typeof mockOrderPaymentRepository>;
  let useCase: CreateOrderPayment;
  beforeEach(() => {
    orders = mockOrderRepository(orderMock());
    payments = mockOrderPaymentRepository();
    useCase = new CreateOrderPayment(
      orders,
      payments,
      mockClock('2026-01-01T00:00:00.000Z'),
    );
  });

  describe('success', () => {
    it('creates pending payment and updates order status', async () => {
      await useCase.run('order-1');
      expect(orders.findByIdForUpdate).toHaveBeenCalledWith('order-1');
      expect(payments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          status: OrderPaymentStatus.PENDING,
          paymentDetails: null,
          paidAt: null,
        }),
      );
      expect(orders.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.PAYMENT_PENDING }),
      );
    });
    it('does nothing if payment already exists', async () => {
      payments.findByOrderId.mockResolvedValue(existingPaymentMock());
      await useCase.run('order-1');
      expect(payments.create).not.toHaveBeenCalled();
      expect(orders.update).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('rejects an unknown order', async () => {
      orders.findByIdForUpdate.mockResolvedValue(null);
      await expect(useCase.run('order-1')).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(payments.create).not.toHaveBeenCalled();
    });
    it('rejects an empty order id before querying persistence', async () => {
      await expect(useCase.run('')).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(orders.findByIdForUpdate).not.toHaveBeenCalled();
    });
  });
});
