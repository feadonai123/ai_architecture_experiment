import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource, getTestRedis, getAppDataSource } from '../../helpers/setup';
import { fieldsToRecord, waitUntil, wasDelivered } from '../../helpers/payment-consumer';
import { createTestFinancialConsumer } from '../../helpers/load-financial-consumer-app';
import { OrderPrefab } from '../../prefabs/order.prefab';
import { OrderPaymentPrefab } from '../../prefabs/order-payment.prefab';
import { OrderPaymentAttemptPrefab } from '../../prefabs/order-payment-attempt.prefab';
import { UserPrefab } from '../../prefabs/user.prefab';
import { ProductPrefab } from '../../prefabs/product.prefab';
import { OrderRecord } from '../../persistence/order.record';
import { OrderPaymentRecord } from '../../persistence/order-payment.record';
import { OrderPaymentAttemptRecord } from '../../persistence/order-payment-attempt.record';
import { ProductRecord } from '../../persistence/product.record';
import { createTestOrderConsumer } from '../../helpers/load-order-consumer-app';

async function fixture(orderStatus = 1, paymentStatus = 0, withPayment = true, attempts = 0) {
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
      attempts,
    });
  return order;
}

const pay = (id: string, idempotencyKey: string, token: unknown = 'sim-approved') =>
  api()
    .post('/orders/' + id + '/payment')
    .set('Idempotency-Key', idempotencyKey)
    .send({ paymentToken: token, amount: 1 });

describe('POST /orders/:orderId/payment', () => {
  it.each([
    ['sim-approved', 1, 200, 'PaymentApproved'],
    ['sim-declined', 2, 422, 'PaymentDeclinedError'],
  ])(
    'processes a definitive %s on the first attempt and publishes after persistence',
    async (token, status, http, type) => {
      const order = await fixture();
      const response = await pay(order.id, uuidv4(), token);
      expect(response.status).toBe(http);
      const payment = await getTestDataSource()
        .getRepository(OrderPaymentRecord)
        .findOneByOrFail({ orderId: order.id });
      expect(payment).toMatchObject({
        status,
        attempts: 1,
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
    },
  );

  it('allows a second chance after a first decline and approves it, without canceling the order', async () => {
    const order = await fixture();
    const firstKey = uuidv4();
    const first = await pay(order.id, firstKey, 'sim-declined');
    expect(first.status).toBe(422);
    const afterFirst = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(afterFirst).toMatchObject({ status: 0, attempts: 1, paymentDetails: null });
    expect(
      (await getTestDataSource().getRepository(OrderRecord).findOneByOrFail({ id: order.id }))
        .status,
    ).toBe(1);
    expect(await getTestRedis().xlen('payments')).toBe(0);

    const secondKey = uuidv4();
    const second = await pay(order.id, secondKey, 'sim-approved');
    expect(second.status).toBe(200);
    const afterSecond = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(afterSecond).toMatchObject({ status: 1, attempts: 2 });
    expect(afterSecond.paidAt).not.toBeNull();
    const entries = await getTestRedis().xrange('payments', '-', '+');
    expect(entries).toHaveLength(1);
    expect(fieldsToRecord(entries[0][1]).event).toBe('PaymentApproved');

    const attempts = await getTestDataSource()
      .getRepository(OrderPaymentAttemptRecord)
      .find({ where: { orderId: order.id }, order: { attemptNumber: 'ASC' } });
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toMatchObject({
      attemptNumber: 1,
      idempotencyKey: firstKey,
      paymentToken: 'sim-declined',
      status: 2,
    });
    expect(attempts[1]).toMatchObject({
      attemptNumber: 2,
      idempotencyKey: secondKey,
      paymentToken: 'sim-approved',
      status: 1,
    });
  });

  it('cancels the order and returns stock after two consecutive declines, exactly once even on event redelivery', async () => {
    const ds = getTestDataSource();
    const user = await UserPrefab.create(ds);
    const product = await ProductPrefab.create(ds, { stock: 10 });
    const created = await api()
      .post('/orders')
      .send({ userId: user.id, items: [{ productId: product.id, quantity: 3 }] });
    expect(created.status).toBe(201);
    expect((await ds.getRepository(ProductRecord).findOneByOrFail({ id: product.id })).stock).toBe(
      7,
    );
    const order = await OrderPrefab.create(ds, {
      id: created.body.id,
      userId: user.id,
      status: 1,
      total: created.body.total,
    });
    await OrderPaymentPrefab.create(ds, { orderId: order.id });

    const first = await pay(order.id, uuidv4(), 'sim-declined');
    expect(first.status).toBe(422);
    expect((await ds.getRepository(OrderRecord).findOneByOrFail({ id: order.id })).status).toBe(1);
    expect((await ds.getRepository(ProductRecord).findOneByOrFail({ id: product.id })).stock).toBe(
      7,
    );
    expect(await getTestRedis().xlen('payments')).toBe(0);

    const second = await pay(order.id, uuidv4(), 'sim-declined');
    expect(second.status).toBe(422);
    const payment = await ds.getRepository(OrderPaymentRecord).findOneByOrFail({
      orderId: order.id,
    });
    expect(payment).toMatchObject({ status: 2, attempts: 2 });
    const entries = await getTestRedis().xrange('payments', '-', '+');
    expect(entries).toHaveLength(1);
    expect(fieldsToRecord(entries[0][1]).event).toBe('PaymentDeclinedError');

    const consumer = await createTestOrderConsumer(getAppDataSource(), getTestRedis());
    try {
      await consumer.start();
      await waitUntil(
        async () =>
          (await ds.getRepository(OrderRecord).findOneByOrFail({ id: order.id })).status === 3,
      );
      expect(
        (await ds.getRepository(ProductRecord).findOneByOrFail({ id: product.id })).stock,
      ).toBe(10);
    } finally {
      await consumer.stop();
    }

    // Redeliver the same definitive decline event and confirm the stock is not returned twice.
    const redelivered = await getTestRedis().xadd(
      'payments',
      '*',
      ...Object.entries(fieldsToRecord(entries[0][1])).flatMap(([field, value]) => [
        field,
        value,
      ]),
    );
    if (!redelivered) throw new Error('Could not redeliver the payments event in the test');
    const other = await createTestOrderConsumer(getAppDataSource(), getTestRedis());
    try {
      await other.start();
      await waitUntil(() => wasDelivered(redelivered));
    } finally {
      await other.stop();
    }
    expect(
      (await ds.getRepository(ProductRecord).findOneByOrFail({ id: product.id })).stock,
    ).toBe(10);
    expect((await ds.getRepository(OrderRecord).findOneByOrFail({ id: order.id })).status).toBe(3);
  });

  it('repeats the first attempt result unchanged with the same key and token after the second attempt resolved', async () => {
    const order = await fixture();
    const firstKey = uuidv4();
    const first = await pay(order.id, firstKey, 'sim-declined');
    expect(first.status).toBe(422);
    await pay(order.id, uuidv4(), 'sim-approved');

    const repeated = await pay(order.id, firstKey, 'sim-declined');
    expect(repeated.status).toBe(422);
    expect(repeated.body).toEqual(first.body);
    expect(await getTestRedis().xlen('payments')).toBe(1);
    const payment = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(payment).toMatchObject({ status: 1, attempts: 2 });
  });

  it('repeats a prior declined attempt result even after the order was canceled by a later attempt', async () => {
    const ds = getTestDataSource();
    const order = await fixture(3, 2, true, 2);
    const firstKey = uuidv4();
    const firstAttemptDetails = { provider: 'simulated', transactionId: uuidv4(), amount: 250 };
    await OrderPaymentAttemptPrefab.create(ds, {
      orderId: order.id,
      attemptNumber: 1,
      idempotencyKey: firstKey,
      paymentToken: 'sim-declined',
      status: 2,
      paymentDetails: firstAttemptDetails,
      paidAt: null,
    });
    const response = await pay(order.id, firstKey, 'sim-declined');
    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: 'PaymentDeclinedError',
      message: 'Payment declined for order: ' + order.id,
      statusCode: 422,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
    const payment = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(payment).toMatchObject({ status: 2, attempts: 2 });
  });

  it('returns a conflict when the same key is reused with a different valid token', async () => {
    const order = await fixture();
    const key = uuidv4();
    const first = await pay(order.id, key, 'sim-declined');
    expect(first.status).toBe(422);
    const conflict = await pay(order.id, key, 'sim-approved');
    expect(conflict.status).toBe(409);
    expect(conflict.body).toEqual({
      error: 'PaymentAttemptConflictError',
      message: 'Payment attempt conflict for order: ' + order.id,
      statusCode: 409,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
    const payment = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(payment).toMatchObject({ status: 0, attempts: 1 });
  });

  it('rejects a new key once the payment reached a definitive state', async () => {
    const order = await fixture(1, 1, true, 1);
    const response = await pay(order.id, uuidv4(), 'sim-declined');
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'InvalidOrderPaymentStateError',
      message: 'Invalid payment state for order: ' + order.id,
      statusCode: 409,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });

  it('rejects a new key once both attempts have been used even while the consumer has not resolved it yet', async () => {
    const order = await fixture(1, 2, true, 2);
    const response = await pay(order.id, uuidv4(), 'sim-approved');
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'InvalidOrderPaymentStateError',
      message: 'Invalid payment state for order: ' + order.id,
      statusCode: 409,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });

  it('serializes two concurrent first attempts and processes only one', async () => {
    const order = await fixture();
    const keys = [uuidv4(), uuidv4()];
    const responses = await Promise.all(keys.map((key) => pay(order.id, key)));
    const statuses = responses.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    expect(await getTestRedis().xlen('payments')).toBe(1);
    const payment = await getTestDataSource()
      .getRepository(OrderPaymentRecord)
      .findOneByOrFail({ orderId: order.id });
    expect(payment).toMatchObject({ status: 1, attempts: 1 });
  });

  it('serializes a retry of the same key concurrently with a new attempt', async () => {
    const order = await fixture();
    const key = uuidv4();
    const first = await pay(order.id, key, 'sim-declined');
    expect(first.status).toBe(422);
    const responses = await Promise.all([
      pay(order.id, key, 'sim-declined'),
      pay(order.id, uuidv4(), 'sim-approved'),
    ]);
    expect(responses[0].body).toEqual(first.body);
    expect(responses[1].status).toBe(200);
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
    expect((await pay(created.body.id, uuidv4())).body.error).toBe('PaymentNotReadyError');
    const consumer = await createTestFinancialConsumer(getAppDataSource(), getTestRedis());
    try {
      await consumer.start();
      await waitUntil(
        async () =>
          (await ds.getRepository(OrderPaymentRecord).countBy({ orderId: created.body.id })) === 1,
      );
      expect((await pay(created.body.id, uuidv4())).status).toBe(200);
    } finally {
      await consumer.stop();
    }
  });

  it.each([
    ['invalid', 400, 'InvalidOrderIdError'],
    ['missing', 404, 'OrderNotFoundError'],
  ])('returns error for %s order', async (id, http, error) => {
    const orderId = id === 'missing' ? uuidv4() : id;
    const response = await pay(orderId, uuidv4());
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
    const response = await pay(order.id, uuidv4(), token);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'InvalidPaymentTokenError',
      message: 'Invalid payment token',
      statusCode: 400,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });

  it('rejects a missing Idempotency-Key header', async () => {
    const order = await fixture();
    const response = await api()
      .post('/orders/' + order.id + '/payment')
      .send({ paymentToken: 'sim-approved' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'InvalidIdempotencyKeyError',
      message: 'Invalid idempotency key',
      statusCode: 400,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });

  it.each(['not-a-uuid', '', '12345'])(
    'rejects an invalid Idempotency-Key header %s',
    async (key) => {
      const order = await fixture();
      const response = await pay(order.id, key);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'InvalidIdempotencyKeyError',
        message: 'Invalid idempotency key',
        statusCode: 400,
      });
      expect(await getTestRedis().xlen('payments')).toBe(0);
    },
  );

  it('rejects a payment not prepared yet', async () => {
    const order = await fixture(0, 0, false);
    const response = await pay(order.id, uuidv4());
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
    const response = await pay(order.id, uuidv4());
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'InvalidOrderPaymentStateError',
      message: 'Invalid payment state for order: ' + order.id,
      statusCode: 409,
    });
    expect(await getTestRedis().xlen('payments')).toBe(0);
  });
});
