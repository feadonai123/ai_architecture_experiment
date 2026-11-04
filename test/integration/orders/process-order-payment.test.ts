import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource, getTestRedis, getAppDataSource } from '../../helpers/setup';
import { fieldsToRecord, waitUntil, publishPaymentEvent, wasDelivered } from '../../helpers/payment-consumer';
import { createTestFinancialConsumer } from '../../helpers/load-financial-consumer-app';
import { createTestOrderConsumer } from '../../helpers/load-order-consumer-app';
import { OrderPrefab } from '../../prefabs/order.prefab';
import { OrderPaymentPrefab } from '../../prefabs/order-payment.prefab';
import { OrderItemPrefab } from '../../prefabs/order-item.prefab';
import { UserPrefab } from '../../prefabs/user.prefab';
import { ProductPrefab } from '../../prefabs/product.prefab';
import { OrderRecord } from '../../persistence/order.record';
import { OrderPaymentRecord } from '../../persistence/order-payment.record';
import { OrderPaymentAttemptRecord } from '../../persistence/order-payment-attempt.record';
import { ProductRecord } from '../../persistence/product.record';

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

async function fixtureWithStock(orderStatus = 1, quantity = 3, stock = 7) {
  const ds = getTestDataSource();
  const user = await UserPrefab.create(ds);
  const product = await ProductPrefab.create(ds, { stock });
  const order = await OrderPrefab.create(ds, { userId: user.id, status: orderStatus, total: 250 });
  await OrderItemPrefab.create(ds, {
    orderId: order.id,
    productId: product.id,
    quantity,
    unitPrice: 10,
  });
  await OrderPaymentPrefab.create(ds, { orderId: order.id });
  return { order, product };
}

const pay = (id: string, token: unknown = 'sim-approved', idempotencyKey: unknown = uuidv4()) => {
  const request = api()
    .post('/orders/' + id + '/payment')
    .send({ paymentToken: token, amount: 1 });
  if (idempotencyKey !== undefined) request.set('Idempotency-Key', idempotencyKey as string);
  return request;
};

describe('POST /orders/:orderId/payment', () => {
  it('approves the first attempt and publishes PaymentApproved', async () => {
    const order = await fixture();
    const response = await pay(order.id, 'sim-approved');
    expect(response.status).toBe(200);
    const payment = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(payment).toMatchObject({
      status: 1,
      paymentDetails: { provider: 'simulated', amount: 250, transactionId: expect.any(String) },
    });
    expect(payment.paidAt).not.toBeNull();
    const entries = await getTestRedis().xrange('payments', '-', '+');
    expect(entries).toHaveLength(1);
    expect(fieldsToRecord(entries[0][1]).event).toBe('PaymentApproved');
    expect(response.body).toEqual({
      orderId: order.id,
      status: 1,
      paymentDetails: payment.paymentDetails,
      paidAt: payment.paidAt!.toISOString(),
      createdAt: payment.createdAt.toISOString(),
    });
  });

  it('keeps the order payable and the stock reserved after a first decline, without publishing an event', async () => {
    const { order, product } = await fixtureWithStock();
    const response = await pay(order.id, 'sim-declined');
    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: 'PaymentDeclinedError',
      message: 'Payment declined for order: ' + order.id,
      statusCode: 422,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
    expect(
      (await getTestDataSource().getRepository(OrderRecord).findOneByOrFail({ id: order.id }))
        .status,
    ).toBe(1);
    expect(
      (await getTestDataSource().getRepository(OrderPaymentRecord).findOneByOrFail({
        orderId: order.id,
      })).status,
    ).toBe(0);
    expect(
      (await getTestDataSource().getRepository(ProductRecord).findOneByOrFail({ id: product.id }))
        .stock,
    ).toBe(4);
    expect(
      await getTestDataSource().getRepository(OrderPaymentAttemptRecord).countBy({
        orderId: order.id,
      }),
    ).toBe(1);
  });

  it('approves the order on a second attempt after a first decline', async () => {
    const order = await fixture();
    const first = await pay(order.id, 'sim-declined');
    expect(first.status).toBe(422);
    const second = await pay(order.id, 'sim-approved');
    expect(second.status).toBe(200);
    const payment = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(payment.status).toBe(1);
    expect(payment.paidAt).not.toBeNull();
    expect(await getTestRedis().xlen('payments')).toBe(1);
    const entries = await getTestRedis().xrange('payments', '-', '+');
    expect(fieldsToRecord(entries[0][1]).event).toBe('PaymentApproved');
    expect(
      await getTestDataSource().getRepository(OrderPaymentAttemptRecord).countBy({
        orderId: order.id,
      }),
    ).toBe(2);
  });

  it('declines the order definitively on a second attempt and publishes PaymentDeclinedError', async () => {
    const { order, product } = await fixtureWithStock();
    const first = await pay(order.id, 'sim-declined');
    expect(first.status).toBe(422);
    const second = await pay(order.id, 'sim-declined');
    expect(second.status).toBe(422);
    expect(second.body).toEqual({
      error: 'PaymentDeclinedError',
      message: 'Payment declined for order: ' + order.id,
      statusCode: 422,
    });
    const payment = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(payment.status).toBe(2);
    expect(await getTestRedis().xlen('payments')).toBe(1);
    const entries = await getTestRedis().xrange('payments', '-', '+');
    expect(fieldsToRecord(entries[0][1]).event).toBe('PaymentDeclinedError');

    const consumer = await createTestOrderConsumer(getAppDataSource(), getTestRedis());
    try {
      await consumer.start();
      await waitUntil(
        async () =>
          (await getTestDataSource().getRepository(OrderRecord).findOneByOrFail({ id: order.id }))
            .status === 3,
      );
    } finally {
      await consumer.stop();
    }
    expect(
      (await getTestDataSource().getRepository(ProductRecord).findOneByOrFail({ id: product.id }))
        .stock,
    ).toBe(7);

    // Redelivers the same PaymentDeclinedError payload, as a message bus would
    // on at-least-once delivery, to confirm the stock is not returned twice.
    const payload = JSON.parse(fieldsToRecord(entries[0][1]).payload);
    const redelivered = await publishPaymentEvent('PaymentDeclinedError', payload);
    const other = await createTestOrderConsumer(getAppDataSource(), getTestRedis());
    try {
      await other.start();
      await waitUntil(() => wasDelivered(redelivered));
    } finally {
      await other.stop();
    }
    expect(
      (await getTestDataSource().getRepository(ProductRecord).findOneByOrFail({ id: product.id }))
        .stock,
    ).toBe(7);
    expect(
      (await getTestDataSource().getRepository(OrderRecord).findOneByOrFail({ id: order.id }))
        .status,
    ).toBe(3);
  });

  it('replays the first decline for a repeated key with the same token, even after the order advanced', async () => {
    const order = await fixture();
    const key = uuidv4();
    const first = await pay(order.id, 'sim-declined', key);
    expect(first.status).toBe(422);
    await pay(order.id, 'sim-approved');
    const repeated = await pay(order.id, 'sim-declined', key);
    expect(repeated.status).toBe(422);
    expect(repeated.body).toEqual(first.body);
    expect(await getTestRedis().xlen('payments')).toBe(1);
    expect(
      await getTestDataSource().getRepository(OrderPaymentAttemptRecord).countBy({
        orderId: order.id,
      }),
    ).toBe(2);
  });

  it('replays the final approval for a repeated key', async () => {
    const order = await fixture();
    const key = uuidv4();
    const first = await pay(order.id, 'sim-approved', key);
    expect(first.status).toBe(200);
    const repeated = await pay(order.id, 'sim-approved', key);
    expect(repeated.status).toBe(200);
    expect(repeated.body).toEqual(first.body);
    expect(await getTestRedis().xlen('payments')).toBe(1);
  });

  it('returns PaymentAttemptConflictError when the same key is reused with a different valid token', async () => {
    const order = await fixture();
    const key = uuidv4();
    await pay(order.id, 'sim-declined', key);
    const response = await pay(order.id, 'sim-approved', key);
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'PaymentAttemptConflictError',
      message: 'Payment attempt conflict for order: ' + order.id,
      statusCode: 409,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });

  it('rejects a new key once the payment already reached a definitive result (approved)', async () => {
    const order = await fixture();
    await pay(order.id, 'sim-approved');
    const response = await pay(order.id, 'sim-approved', uuidv4());
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'InvalidOrderPaymentStateError',
      message: 'Invalid payment state for order: ' + order.id,
      statusCode: 409,
    });
  });

  it('rejects a new key once two attempts were already made and the second was a decline', async () => {
    const order = await fixture();
    await pay(order.id, 'sim-declined');
    await pay(order.id, 'sim-declined');
    const response = await pay(order.id, 'sim-approved', uuidv4());
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'InvalidOrderPaymentStateError',
      message: 'Invalid payment state for order: ' + order.id,
      statusCode: 409,
    });
  });

  it('rejects a new key while the consumer still processes the definitive result asynchronously', async () => {
    const order = await fixture();
    await pay(order.id, 'sim-approved');
    // The order consumer has not run yet: the order is still PAYMENT_PENDING,
    // but the payment already reached its definitive PAID result.
    expect(
      (await getTestDataSource().getRepository(OrderRecord).findOneByOrFail({ id: order.id }))
        .status,
    ).toBe(1);
    const response = await pay(order.id, 'sim-declined', uuidv4());
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('InvalidOrderPaymentStateError');
  });

  it('serializes simultaneous first attempts and persists a single result', async () => {
    const order = await fixture();
    const key = uuidv4();
    const responses = await Promise.all([
      pay(order.id, 'sim-approved', key),
      pay(order.id, 'sim-approved', key),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(responses[0].body).toEqual(responses[1].body);
    expect(await getTestRedis().xlen('payments')).toBe(1);
    expect(
      await getTestDataSource().getRepository(OrderPaymentAttemptRecord).countBy({
        orderId: order.id,
      }),
    ).toBe(1);
  });

  it('serializes two concurrent distinct attempts, respecting the two-attempt limit', async () => {
    const order = await fixture();
    const responses = await Promise.all([
      pay(order.id, 'sim-declined', uuidv4()),
      pay(order.id, 'sim-declined', uuidv4()),
    ]);
    const statuses = responses.map((r) => r.status).sort();
    expect(statuses).toEqual([422, 422]);
    expect(
      await getTestDataSource().getRepository(OrderPaymentAttemptRecord).countBy({
        orderId: order.id,
      }),
    ).toBe(2);
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

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a uuid', 'not-a-uuid'],
  ])('rejects %s Idempotency-Key header', async (_label, key) => {
    const order = await fixture();
    const response = await pay(order.id, 'sim-approved', key);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'InvalidIdempotencyKeyError',
      message: 'Invalid idempotency key',
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
