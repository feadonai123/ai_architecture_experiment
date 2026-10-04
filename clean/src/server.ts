import 'reflect-metadata';
import { EventDispatcher } from './consumers/EventDispatcher';
import { ConsumerSettings } from './consumers/ConsumerSettings';
import { FinancialConsumer } from './consumers/FinancialConsumer';
import { OrderCreatedHandler } from './consumers/OrderCreatedHandler';
import { EventFactory, RedisConsumer } from './consumers/RedisConsumer';
import { OrderCreatedEvent } from './events/OrderCreatedEvent';
import { EventType } from './events/EventType';
import { createApp } from './app';
import { applySchema, createDataSource } from './infrastructure/createDataSource';
import { TypeOrmOrderPaymentRepository } from './repositories/TypeOrmOrderPaymentRepository';
import { TypeOrmOrderRepository } from './repositories/TypeOrmOrderRepository';
import { EventRedisService } from './services/EventRedisService';
import { createRedis, ping } from './services/redis';
import { ProcessOrderCreated } from './usecases/ProcessOrderCreated';
import { loadAppEnv, requireEnv } from './utils/env';

loadAppEnv();

async function start(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await applySchema(dataSource);

  const redis = createRedis();
  await ping();

  const dispatcher = new EventDispatcher();
  const eventFactories = new Map<EventType, EventFactory>([
    [EventType.OrderCreated, (id, payload, timestamp) => new OrderCreatedEvent(id, payload, timestamp)],
  ]);
  const consumer = new RedisConsumer(
    new EventRedisService(redis),
    dispatcher,
    new ConsumerSettings('FINANCIAL_CONSUMER'),
    redis,
    eventFactories,
    'financial',
  );
  const financialConsumer = new FinancialConsumer(
    consumer,
    dispatcher,
    new OrderCreatedHandler(
      dataSource,
      new ProcessOrderCreated(
        new TypeOrmOrderRepository(dataSource),
        new TypeOrmOrderPaymentRepository(dataSource),
        () => new Date(),
      ),
    ),
  );
  await financialConsumer.start();

  const app = createApp(dataSource, redis);
  const port = Number(requireEnv('PORT'));
  const server = app.listen(port, () => {
    console.log(`clean listening on ${port}`);
  });

  let stopping = false;
  async function shutdown(): Promise<void> {
    if (stopping) return;
    stopping = true;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await financialConsumer.stop();
    await redis.quit();
    await dataSource.destroy();
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void shutdown().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    });
  }
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
