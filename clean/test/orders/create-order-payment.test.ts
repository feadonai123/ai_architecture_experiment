import { OrderPaymentStatus } from '../../src/entities/OrderPaymentStatus';
import { OrderStatus } from '../../src/entities/OrderStatus';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { CreateOrderPayment } from '../../src/usecases/CreateOrderPayment';
import { mockOrderDependencies } from '../mocks/order';

describe('create order payment', () => {
  let deps: ReturnType<typeof mockOrderDependencies>;
  let useCase: CreateOrderPayment;
  beforeEach(() => {
    deps = mockOrderDependencies();
    useCase = new CreateOrderPayment(
      deps.orders,
      deps.payments,
      () => new Date('2026-01-01T00:00:00.000Z'),
    );
  });

  describe('success', () => {
    it('creates pending payment and updates order status', async () => {
      await useCase.run('order-1');
      expect(deps.orders.findByIdForUpdate).toHaveBeenCalledWith('order-1');
      expect(deps.payments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          status: OrderPaymentStatus.PENDING,
          paymentDetails: null,
          paidAt: null,
        }),
      );
      expect(deps.orders.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.PAYMENT_PENDING }),
      );
    });
    it('does nothing if payment already exists', async () => {
      deps.payments.findByOrderId.mockResolvedValue({ orderId: 'order-1' });
      await useCase.run('order-1');
      expect(deps.payments.create).not.toHaveBeenCalled();
      expect(deps.orders.update).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('rejects an unknown order', async () => {
      deps.orders.findByIdForUpdate.mockResolvedValue(null);
      await expect(useCase.run('order-1')).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(deps.payments.create).not.toHaveBeenCalled();
    });
    it('rejects an empty order id before querying persistence', async () => {
      await expect(useCase.run('')).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(deps.orders.findByIdForUpdate).not.toHaveBeenCalled();
    });
  });
});
