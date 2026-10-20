import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getAppDataSource, getTestDataSource, getTestRedis } from '../../helpers/setup';
import { createTestOrderConsumer } from '../../helpers/load-order-consumer-app';
import { publishPaymentEvent, wasDelivered, waitUntil } from '../../helpers/payment-consumer';
import { UserPrefab } from '../../prefabs/user.prefab';
import { OrderPrefab } from '../../prefabs/order.prefab';
import { OrderPaymentPrefab } from '../../prefabs/order-payment.prefab';
import { OrderRecord } from '../../persistence/order.record';
import { OrderPaymentRecord } from '../../persistence/order-payment.record';

enum OrderStatus {
  PENDING,
  PAYMENT_PENDING,
  PAID,
  CANCELED,
}
enum PaymentStatus {
  PENDING,
  PAID,
  DECLINED,
}
const url = (id: string) => '/orders/' + id + '/status';
async function fixture(status: OrderStatus) {
  const ds = getTestDataSource();
  const user = await UserPrefab.create(ds);
  return OrderPrefab.create(ds, { userId: user.id, status });
}

describe('GET /orders/:orderId/status', () => {
  it.each([
    OrderStatus.PENDING,
    OrderStatus.PAYMENT_PENDING,
    OrderStatus.PAID,
    OrderStatus.CANCELED,
  ])('returns order status %s without requiring a payment', async (status) => {
    const order = await fixture(status);
    const response = await api().get(url(order.id));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ orderId: order.id, status });
    expect(await getTestDataSource().getRepository(OrderPaymentRecord).count()).toBe(0);
  });

  it.each([PaymentStatus.PAID, PaymentStatus.DECLINED])(
    'reads the order despite definitive payment status %s and preserves data on repeated calls',
    async (status) => {
      const ds = getTestDataSource();
      const order = await fixture(OrderStatus.PAYMENT_PENDING);
      const payment = await OrderPaymentPrefab.create(ds, {
        orderId: order.id,
        status,
        paymentDetails: { provider: 'simulated', transactionId: uuidv4(), amount: order.total },
        paidAt: status === PaymentStatus.PAID ? new Date() : null,
      });
      for (let i = 0; i < 2; i += 1) {
        const response = await api().get(url(order.id));
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ orderId: order.id, status: OrderStatus.PAYMENT_PENDING });
      }
      expect(await ds.getRepository(OrderRecord).findOneByOrFail({ id: order.id })).toEqual(order);
      expect(
        await ds.getRepository(OrderPaymentRecord).findOneByOrFail({ orderId: order.id }),
      ).toEqual(payment);
      expect(await getTestRedis().xlen('orders')).toBe(0);
      expect(await getTestRedis().xlen('payments')).toBe(0);
    },
  );

  it.each([
    ['PaymentApproved', OrderStatus.PAID],
    ['PaymentDeclinedError', OrderStatus.CANCELED],
  ] as const)('reflects %s after the consumer commits', async (event, targetStatus) => {
    const order = await fixture(OrderStatus.PAYMENT_PENDING);
    const before = await api().get(url(order.id));
    expect(before.body).toEqual({ orderId: order.id, status: OrderStatus.PAYMENT_PENDING });
    const consumer = await createTestOrderConsumer(getAppDataSource(), getTestRedis());
    try {
      await consumer.start();
      const entry = await publishPaymentEvent(event, {
        orderId: order.id,
        transactionId: uuidv4(),
        amount: order.total,
        ...(event === 'PaymentApproved' ? { paidAt: new Date().toISOString() } : {}),
      });
      await waitUntil(() => wasDelivered(entry));
      const response = await api().get(url(order.id));
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ orderId: order.id, status: targetStatus });
    } finally {
      await consumer.stop();
    }
  });

  it.each(['invalid', '00000000-0000-0000-0000-000000000000'])(
    'returns InvalidOrderIdError for %s',
    async (id) => {
      const response = await api().get(url(id));
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'InvalidOrderIdError',
        message: 'Invalid order id: ' + id,
        statusCode: 400,
      });
    },
  );
  it('returns OrderNotFoundError for an unknown UUID', async () => {
    const id = uuidv4();
    const response = await api().get(url(id));
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'OrderNotFoundError',
      message: 'Order not found: ' + id,
      statusCode: 404,
    });
  });
});
