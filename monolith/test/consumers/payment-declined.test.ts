import { ProductNotFoundError } from '../../src/errors';
import { OrderStatus } from '../../src/enums/OrderStatus';
import {
  orderMock,
  payloadMock,
  eventId,
  declinedItemsMock,
  declinedProductMock,
} from '../mocks/payment-declined';
import { handlePaymentDeclined } from '../../src/consumers/consumerOrder';
import { PaymentDeclinedErrorPayload } from '../../src/events/PaymentDeclinedErrorEvent';
import { OrderNotFoundError, InvalidOrderPaymentStateError } from '../../src/errors';
import { mockProductRepo } from '../mocks/product';
import { mockOrderItemRepo } from '../mocks/orderItem';
import { mockOrderRepo } from '../mocks/order';
import { mockDataSource } from '../mocks/dataSource';

function fixture(order = orderMock() as ReturnType<typeof orderMock> | null) {
  const orders = mockOrderRepo({ findOne: order });
  const products = mockProductRepo({ findOne: declinedProductMock() });
  const ds = mockDataSource({
    order: orders,
    product: products,
    orderItem: mockOrderItemRepo({ find: declinedItemsMock() }),
  });
  return {
    invoke: () => handlePaymentDeclined(ds, eventId, new PaymentDeclinedErrorPayload(payloadMock)),
    save: orders.save,
    products,
  };
}
describe('cancelOrderPayment', () => {
  afterEach(() => jest.restoreAllMocks());
  describe('success', () => {
    it('cancels and restores stock only once on redelivery', async () => {
      const f = fixture();
      await f.invoke();
      await f.invoke();
      expect(f.products.update).toHaveBeenCalledTimes(1);
      expect(f.products.update).toHaveBeenCalledWith('product-1', { stock: 10 });
      expect(f.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELED }),
      );
    });
    it('ignores duplicate delivery', async () => {
      const f = fixture(orderMock(OrderStatus.CANCELED));
      await f.invoke();
      expect(f.save).not.toHaveBeenCalled();
      expect(f.products.update).not.toHaveBeenCalled();
    });
  });
  describe('errors', () => {
    it('rejects missing stock product without canceling the order', async () => {
      const f = fixture();
      f.products.findOne.mockResolvedValue(null);
      await expect(f.invoke()).rejects.toBeInstanceOf(ProductNotFoundError);
      expect(f.save).not.toHaveBeenCalled();
      expect(f.products.update).not.toHaveBeenCalled();
    });
    it('rejects an unknown order', async () => {
      const f = fixture(null);
      await expect(f.invoke()).rejects.toBeInstanceOf(OrderNotFoundError);
      expect(f.save).not.toHaveBeenCalled();
      expect(f.products.update).not.toHaveBeenCalled();
    });
    it.each([OrderStatus.PENDING, OrderStatus.PAID])(
      'rejects incompatible status %s',
      async (status) => {
        const f = fixture(orderMock(status));
        await expect(f.invoke()).rejects.toBeInstanceOf(InvalidOrderPaymentStateError);
        expect(f.save).not.toHaveBeenCalled();
        expect(f.products.update).not.toHaveBeenCalled();
      },
    );
  });
});
