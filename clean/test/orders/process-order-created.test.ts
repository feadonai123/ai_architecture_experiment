import { OrderPaymentStatus } from '../../src/entities/OrderPaymentStatus';
import { OrderStatus } from '../../src/entities/OrderStatus';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { InvalidOrderCreatedPayloadError } from '../../src/errors/InvalidOrderCreatedPayloadError';
import { OrderCreatedEvent, OrderCreatedPayload } from '../../src/events/OrderCreatedEvent';
import { ProcessOrderCreated } from '../../src/usecases/ProcessOrderCreated';
import { mockOrderDependencies } from '../mocks/order';

describe('process order created', () => {
  let deps: ReturnType<typeof mockOrderDependencies>;
  let useCase: ProcessOrderCreated;
  const event = new OrderCreatedEvent(
    'order-1',
    new OrderCreatedPayload({
      orderId: 'order-1',
      userId: 'user-1',
      items: [{ productId: 'product-1', quantity: 2 }],
    }),
  );
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
      await useCase.run(event);
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
      await useCase.run(event);
      expect(deps.payments.create).not.toHaveBeenCalled();
      expect(deps.orders.update).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('rejects an unknown order', async () => {
      deps.orders.findByIdForUpdate.mockResolvedValue(null);
      await expect(useCase.run(event)).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(deps.payments.create).not.toHaveBeenCalled();
    });
    it('rejects malformed payload', async () => {
      await expect(useCase.run(new OrderCreatedEvent('order-1', '{'))).rejects.toBeInstanceOf(
        InvalidOrderCreatedPayloadError,
      );
      expect(deps.orders.findByIdForUpdate).not.toHaveBeenCalled();
    });
  });
});
