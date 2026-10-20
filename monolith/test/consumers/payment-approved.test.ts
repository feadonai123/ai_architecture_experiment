import { OrderStatus } from '../../src/enums/OrderStatus';
import { orderMock, payloadMock, eventId } from '../mocks/payment-approved';
import { handlePaymentApproved } from '../../src/consumers/consumerOrder';
import { PaymentApprovedPayload } from '../../src/events/PaymentApprovedEvent';
import { OrderNotFoundError, InvalidOrderPaymentStateError } from '../../src/errors';
import { mockOrderRepo } from '../mocks/order';
import { mockDataSource } from '../mocks/dataSource';

function fixture(order = orderMock() as ReturnType<typeof orderMock> | null) {
  const orders = mockOrderRepo({ findOne: order });
  const ds = mockDataSource({ order: orders });
  return {
    invoke: () => handlePaymentApproved(ds, eventId, new PaymentApprovedPayload(payloadMock)),
    save: orders.save,
  };
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
