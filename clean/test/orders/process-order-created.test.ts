import { OrderPaymentStatus } from '../../src/entities/OrderPaymentStatus';
import { OrderStatus } from '../../src/entities/OrderStatus';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { ProcessOrderCreated } from '../../src/usecases/ProcessOrderCreated';
import { mockOrderDependencies } from '../mocks/order';

describe('process order created', () => {
  let deps: ReturnType<typeof mockOrderDependencies>;
  let useCase: ProcessOrderCreated;
  beforeEach(() => {
    deps = mockOrderDependencies();
    useCase = new ProcessOrderCreated(
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
  });
});
