import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource, getTestRedis, getAppDataSource } from '../../helpers/setup';
import { fieldsToRecord, waitUntil } from '../../helpers/payment-consumer';
import { createTestFinancialConsumer } from '../../helpers/load-financial-consumer-app';
import { OrderPrefab } from '../../prefabs/order.prefab';
import { OrderPaymentPrefab } from '../../prefabs/order-payment.prefab';
import { UserPrefab } from '../../prefabs/user.prefab';
import { ProductPrefab } from '../../prefabs/product.prefab';
import { OrderRecord } from '../../persistence/order.record';
import { OrderPaymentRecord } from '../../persistence/order-payment.record';
async function fixture(orderStatus = 1, paymentStatus = 0, withPayment = true) {
  const ds = getTestDataSource();
  const user = await UserPrefab.create(ds);
  const order = await OrderPrefab.create(ds, { userId: user.id, status: orderStatus, total: 250 });
  if (withPayment)
    await OrderPaymentPrefab.create(ds, {
      orderId: order.id,
      status: paymentStatus,
      paymentDetails: paymentStatus
        ? { provider: 'simulated', transactionId: uuidv4(), amount: 250 }
        : null,
      paidAt: paymentStatus === 1 ? new Date() : null,
    });
  return order;
}
const pay = (id: string, ...tokens: unknown[]) =>
  api()
    .post('/orders/' + id + '/payment')
    .send({ paymentToken: tokens.length ? tokens[0] : 'sim-approved', amount: 1 });
describe('POST /orders/:orderId/payment', () => {
  it.each([
    ['sim-approved', 1, 200, 'PaymentApproved'],
    ['sim-declined', 2, 422, 'PaymentDeclinedError'],
  ])('processes %s and publishes after persistence', async (token, status, http, type) => {
    const order = await fixture();
    const response = await pay(order.id, token);
    expect(response.status).toBe(http);
    const payment = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(payment).toMatchObject({
      status,
      paymentDetails: { provider: 'simulated', amount: 250, transactionId: expect.any(String) },
    });
    expect(payment.paidAt === null).toBe(status === 2);
    expect(
      (await getTestDataSource().getRepository(OrderRecord).findOneByOrFail({ id: order.id }))
        .status,
    ).toBe(1);
    const entries = await getTestRedis().xrange('payments', '-', '+');
    expect(entries).toHaveLength(1);
    const fields = fieldsToRecord(entries[0][1]);
    expect(fields.event).toBe(type);
    expect(JSON.parse(fields.payload)).toMatchObject({
      orderId: order.id,
      transactionId: payment.paymentDetails!.transactionId,
      amount: 250,
    });
    if (http === 200)
      expect(response.body).toEqual({
        orderId: order.id,
        status: 1,
        paymentDetails: payment.paymentDetails,
        paidAt: payment.paidAt!.toISOString(),
        createdAt: payment.createdAt.toISOString(),
      });
    else
      expect(response.body).toEqual({
        error: 'PaymentDeclinedError',
        message: 'Payment declined for order: ' + order.id,
        statusCode: 422,
      });
  });
  it.each([
    [1, 1, 200],
    [2, 1, 422],
    [1, 2, 200],
    [2, 3, 422],
  ])('preserves processed payment %s with order %s', async (status, orderStatus, http) => {
    const order = await fixture(orderStatus, status);
    const repo = getTestDataSource().getRepository(OrderPaymentRecord);
    const before = await repo.findOneByOrFail({ orderId: order.id });
    expect((await pay(order.id, status === 1 ? 'sim-declined' : 'sim-approved')).status).toBe(http);
    expect(await repo.findOneByOrFail({ orderId: order.id })).toEqual(before);
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });
  it('serializes simultaneous requests and publishes once', async () => {
    const order = await fixture();
    const responses = await Promise.all([pay(order.id), pay(order.id)]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(responses[0].body).toEqual(responses[1].body);
    expect(await getTestRedis().xlen('payments')).toBe(1);
  });
  it('prevents a new attempt after a declined payment', async () => {
    const order = await fixture();
    const first = await pay(order.id, 'sim-declined');
    const second = await pay(order.id);
    expect(first.status).toBe(422);
    expect(second.body).toEqual(first.body);
    expect(await getTestRedis().xlen('payments')).toBe(1);
  });
  it('becomes ready after financial consumption of OrderCreated', async () => {
    const ds = getTestDataSource();
    const user = await UserPrefab.create(ds);
    const product = await ProductPrefab.create(ds);
    const created = await api()
      .post('/orders')
      .send({ userId: user.id, items: [{ productId: product.id, quantity: 1 }] });
    expect(created.status).toBe(201);
    expect((await pay(created.body.id)).body.error).toBe('PaymentNotReadyError');
    const consumer = await createTestFinancialConsumer(getAppDataSource(), getTestRedis());
    try {
      await consumer.start();
      await waitUntil(
        async () =>
          (await ds.getRepository(OrderPaymentRecord).countBy({ orderId: created.body.id })) === 1,
      );
      expect((await pay(created.body.id)).status).toBe(200);
    } finally {
      await consumer.stop();
    }
  });
  it.each([
    ['invalid', 400, 'InvalidOrderIdError'],
    ['missing', 404, 'OrderNotFoundError'],
  ])('returns error for %s order', async (id, http, error) => {
    const orderId = id === 'missing' ? uuidv4() : id;
    const response = await pay(orderId);
    expect(response.status).toBe(http);
    expect(response.body).toEqual({
      error,
      message:
        (error === 'InvalidOrderIdError' ? 'Invalid order id: ' : 'Order not found: ') + orderId,
      statusCode: http,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });
  it.each([undefined, null, '', 42, 'unknown'])('rejects invalid token %s', async (token) => {
    const order = await fixture();
    const response = await pay(order.id, token);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'InvalidPaymentTokenError',
      message: 'Invalid payment token',
      statusCode: 400,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });
  it('rejects a payment not prepared yet', async () => {
    const order = await fixture(0, 0, false);
    const response = await pay(order.id);
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'PaymentNotReadyError',
      message: 'Payment not ready for order: ' + order.id,
      statusCode: 409,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });
  it.each([
    [0, 0],
    [3, 0],
    [3, 1],
    [2, 2],
  ])('rejects incompatible order %s and payment %s', async (orderStatus, paymentStatus) => {
    const order = await fixture(orderStatus, paymentStatus);
    const response = await pay(order.id);
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'InvalidOrderPaymentStateError',
      message: 'Invalid payment state for order: ' + order.id,
      statusCode: 409,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });
});
