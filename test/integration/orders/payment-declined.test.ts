import { v4 as uuidv4 } from 'uuid';
import { getAppDataSource, getTestDataSource, getTestRedis } from '../../helpers/setup';
import { createTestOrderConsumer, TestOrderConsumer } from '../../helpers/load-order-consumer-app';
import {
  publishPaymentEvent,
  wasDelivered,
  waitUntil,
  fieldsToRecord,
} from '../../helpers/payment-consumer';
import { requireEnv } from '../../helpers/env';
import { OrderPrefab } from '../../prefabs/order.prefab';
import { OrderPaymentPrefab } from '../../prefabs/order-payment.prefab';
import { UserPrefab } from '../../prefabs/user.prefab';
import { OrderRecord } from '../../persistence/order.record';
import { api } from '../../helpers/api';
function payload(orderId: string) {
  return { orderId, transactionId: uuidv4(), amount: 250 };
}
describe('PaymentDeclinedError order consumer', () => {
  let consumer: TestOrderConsumer;
  beforeEach(async () => {
    consumer = await createTestOrderConsumer(getAppDataSource(), getTestRedis());
    await consumer.start();
  });
  afterEach(async () => {
    await consumer?.stop();
  });
  it('updates the pending order and acknowledges after commit', async () => {
    const ds = getTestDataSource();
    const user = await UserPrefab.create(ds);
    const order = await OrderPrefab.create(ds, { userId: user.id, status: 1 });
    const id = await publishPaymentEvent('PaymentDeclinedError', payload(order.id));
    await waitUntil(() => wasDelivered(id));
    expect((await ds.getRepository(OrderRecord).findOneByOrFail({ id: order.id })).status).toBe(3);
  });
  it('handles repeated deliveries idempotently', async () => {
    const ds = getTestDataSource();
    const user = await UserPrefab.create(ds);
    const order = await OrderPrefab.create(ds, { userId: user.id, status: 1 });
    const data = payload(order.id);
    const first = await publishPaymentEvent('PaymentDeclinedError', data);
    await waitUntil(() => wasDelivered(first));
    const second = await publishPaymentEvent('PaymentDeclinedError', data);
    await waitUntil(() => wasDelivered(second));
    expect((await ds.getRepository(OrderRecord).findOneByOrFail({ id: order.id })).status).toBe(3);
  });
  it('consumes the event published by the payment route', async () => {
    const ds = getTestDataSource();
    const user = await UserPrefab.create(ds);
    const order = await OrderPrefab.create(ds, { userId: user.id, status: 1 });
    await OrderPaymentPrefab.create(ds, { orderId: order.id });
    const response = await api()
      .post('/orders/' + order.id + '/payment')
      .send({ paymentToken: 'sim-declined' });
    expect(response.status).toBe(422);
    await waitUntil(
      async () =>
        (await ds.getRepository(OrderRecord).findOneByOrFail({ id: order.id })).status === 3,
    );
    const entries = await getTestRedis().xrange('payments', '-', '+');
    await waitUntil(() => wasDelivered(entries[0][0]));
  });
  it('schedules OrderNotFoundError for retry without acknowledgment', async () => {
    const redis = getTestRedis();
    const entry = await publishPaymentEvent('PaymentDeclinedError', payload(uuidv4()));
    const key = 'payments:' + entry;
    await waitUntil(
      async () =>
        (await redis.zscore(requireEnv('ORDER_CONSUMER_RETRY_SCHEDULE_KEY'), key)) !== null,
    );
    const state = await redis.hgetall(
      requireEnv('ORDER_CONSUMER_RETRY_EVENT_KEY_PREFIX') + ':' + key,
    );
    expect(state.lastError).toContain('Order not found:');
    expect(
      await redis.xpending('payments', requireEnv('ORDER_CONSUMER_GROUP'), entry, entry, 1),
    ).toHaveLength(1);
  });
  it('does not overwrite an incompatible terminal state', async () => {
    const ds = getTestDataSource();
    const redis = getTestRedis();
    const user = await UserPrefab.create(ds);
    const order = await OrderPrefab.create(ds, { userId: user.id, status: 2 });
    const entry = await publishPaymentEvent('PaymentDeclinedError', payload(order.id));
    const key = 'payments:' + entry;
    await waitUntil(
      async () =>
        (await redis.zscore(requireEnv('ORDER_CONSUMER_RETRY_SCHEDULE_KEY'), key)) !== null,
    );
    expect((await ds.getRepository(OrderRecord).findOneByOrFail({ id: order.id })).status).toBe(2);
    expect(
      (await redis.hgetall(requireEnv('ORDER_CONSUMER_RETRY_EVENT_KEY_PREFIX') + ':' + key))
        .lastError,
    ).toContain('Invalid payment state for order:');
  });
  it.each([
    '{invalid-json',
    JSON.stringify({ orderId: 'invalid' }),
    JSON.stringify({ orderId: uuidv4(), transactionId: uuidv4(), amount: '250' }),
  ])('sends invalid payload to Dead Letter and acknowledges', async (data) => {
    const redis = getTestRedis();
    const entry = await publishPaymentEvent('PaymentDeclinedError', data);
    const dead = requireEnv('ORDER_CONSUMER_DEAD_LETTER_STREAM');
    await waitUntil(async () => (await redis.xlen(dead)) === 1 && (await wasDelivered(entry)));
    const entries = await redis.xrange(dead, '-', '+');
    expect(fieldsToRecord(entries[0][1])).toMatchObject({
      event: 'PaymentDeclinedError',
      errorName: 'InvalidPaymentDeclinedPayloadError',
      sourceEntryId: entry,
    });
    expect(
      await redis.zscore(requireEnv('ORDER_CONSUMER_RETRY_SCHEDULE_KEY'), 'payments:' + entry),
    ).toBeNull();
  });
});
