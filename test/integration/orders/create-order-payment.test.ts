import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  createTestFinancialConsumer,
  TestFinancialConsumer,
} from '../../helpers/load-financial-consumer-app';
import { requireEnv } from '../../helpers/env';
import { getAppDataSource, getTestDataSource, getTestRedis } from '../../helpers/setup';
import { OrderPaymentRecord } from '../../persistence/order-payment.record';
import { OrderRecord } from '../../persistence/order.record';
import { OrderPrefab } from '../../prefabs/order.prefab';
import { UserPrefab } from '../../prefabs/user.prefab';

const STREAM = requireEnv('FINANCIAL_CONSUMER_STREAMS').split(',')[0].trim();
const EVENT = requireEnv('FINANCIAL_CONSUMER_SUPPORTED_EVENTS').split(',')[0].trim();
const GROUP = requireEnv('FINANCIAL_CONSUMER_GROUP');
const DEAD_LETTER_STREAM = requireEnv('FINANCIAL_CONSUMER_DEAD_LETTER_STREAM');
const RETRY_SCHEDULE_KEY = requireEnv('FINANCIAL_CONSUMER_RETRY_SCHEDULE_KEY');
const RETRY_EVENT_KEY_PREFIX = requireEnv('FINANCIAL_CONSUMER_RETRY_EVENT_KEY_PREFIX');

type OrderCreatedPayload = {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
};

async function publishOrderCreated(
  redis: Redis,
  payload: OrderCreatedPayload | string,
): Promise<string> {
  const entryId = await redis.xadd(
    STREAM,
    '*',
    'event',
    EVENT,
    'eventId',
    uuidv4(),
    'timestamp',
    new Date().toISOString(),
    'payload',
    typeof payload === 'string' ? payload : JSON.stringify(payload),
  );
  if (!entryId) throw new Error('Failed to publish OrderCreated in the integration test');
  return entryId;
}

async function waitUntil(predicate: () => Promise<boolean>, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Condition was not met within ${timeoutMs}ms`);
}

function fieldsToRecord(fields: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < fields.length; index += 2) {
    result[fields[index]] = fields[index + 1];
  }
  return result;
}

async function wasDelivered(redis: Redis, entryId: string): Promise<boolean> {
  try {
    const groups = (await redis.xinfo('GROUPS', STREAM)) as string[][];
    const group = groups.map(fieldsToRecord).find((entry) => entry.name === GROUP);
    return group?.['last-delivered-id'] === entryId && Number(group.pending) === 0;
  } catch {
    return false;
  }
}

const describeWithConsumer = requireEnv('APP_TARGET') === 'domain' ? describe.skip : describe;

describeWithConsumer('OrderCreated financial consumer', () => {
  let consumer: TestFinancialConsumer;

  beforeEach(async () => {
    consumer = await createTestFinancialConsumer(getAppDataSource(), getTestRedis());
    await consumer.start();
  });

  afterEach(async () => {
    await consumer.stop();
  });

  it('creates a pending payment and updates the order', async () => {
    const dataSource = getTestDataSource();
    const user = await UserPrefab.create(dataSource);
    const order = await OrderPrefab.create(dataSource, { userId: user.id });
    const payload = {
      orderId: order.id,
      userId: user.id,
      items: [{ productId: uuidv4(), quantity: 2 }],
    };

    const entryId = await publishOrderCreated(getTestRedis(), payload);

    await waitUntil(async () => {
      const payment = await dataSource
        .getRepository(OrderPaymentRecord)
        .findOneBy({ orderId: order.id });
      return Boolean(payment) && (await wasDelivered(getTestRedis(), entryId));
    });
    expect(
      await dataSource.getRepository(OrderPaymentRecord).findOneBy({ orderId: order.id }),
    ).toMatchObject({
      status: 0,
      paymentDetails: null,
      paidAt: null,
    });
    expect(await dataSource.getRepository(OrderRecord).findOneBy({ id: order.id })).toMatchObject({
      status: 1,
    });
  });

  it('does not create another payment for a duplicate delivery', async () => {
    const dataSource = getTestDataSource();
    const redis = getTestRedis();
    const user = await UserPrefab.create(dataSource);
    const order = await OrderPrefab.create(dataSource, { userId: user.id });
    const payload = {
      orderId: order.id,
      userId: user.id,
      items: [{ productId: uuidv4(), quantity: 1 }],
    };

    const firstEntryId = await publishOrderCreated(redis, payload);
    await waitUntil(() => wasDelivered(redis, firstEntryId));
    const duplicateEntryId = await publishOrderCreated(redis, payload);
    await waitUntil(() => wasDelivered(redis, duplicateEntryId));

    expect(await dataSource.getRepository(OrderPaymentRecord).countBy({ orderId: order.id })).toBe(
      1,
    );
    expect(await dataSource.getRepository(OrderRecord).findOneBy({ id: order.id })).toMatchObject({
      status: 1,
    });
  });

  it('keeps a missing order pending and schedules its retry', async () => {
    const redis = getTestRedis();
    const orderId = uuidv4();
    const entryId = await publishOrderCreated(redis, {
      orderId,
      userId: uuidv4(),
      items: [{ productId: uuidv4(), quantity: 1 }],
    });
    const retryMember = `${STREAM}:${entryId}`;
    const retryKey = `${RETRY_EVENT_KEY_PREFIX}:${retryMember}`;

    await waitUntil(async () => (await redis.zscore(RETRY_SCHEDULE_KEY, retryMember)) !== null);

    const pending = (await redis.xpending(STREAM, GROUP, entryId, entryId, 1)) as Array<
      [string, string, number, number]
    >;
    expect(pending.map(([pendingEntryId]) => pendingEntryId)).toContain(entryId);
    expect(await redis.hgetall(retryKey)).toMatchObject({
      eventId: expect.any(String),
      entryId,
      stream: STREAM,
      deliveryCount: '1',
    });
    expect(await getTestDataSource().getRepository(OrderPaymentRecord).count()).toBe(0);
  });

  it('sends an invalid payload to Dead Letter without creating a payment', async () => {
    const redis = getTestRedis();
    const entryId = await publishOrderCreated(redis, '{invalid-json');

    await waitUntil(async () => {
      if ((await redis.xlen(DEAD_LETTER_STREAM)) !== 1) return false;
      const pending = (await redis.xpending(STREAM, GROUP, entryId, entryId, 1)) as unknown[];
      return (
        pending.length === 0 &&
        (await redis.zscore(RETRY_SCHEDULE_KEY, `${STREAM}:${entryId}`)) === null
      );
    });

    const deadLetters = await redis.xrange(DEAD_LETTER_STREAM, '-', '+');
    expect(fieldsToRecord(deadLetters[0][1])).toMatchObject({
      sourceStream: STREAM,
      sourceEntryId: entryId,
      consumerGroup: GROUP,
      event: EVENT,
      errorName: 'InvalidOrderCreatedPayloadError',
    });
    expect(await getTestDataSource().getRepository(OrderPaymentRecord).count()).toBe(0);
    expect((await redis.xpending(STREAM, GROUP, entryId, entryId, 1)) as unknown[]).toHaveLength(0);
    expect(await redis.zscore(RETRY_SCHEDULE_KEY, `${STREAM}:${entryId}`)).toBeNull();
  });
});
