import { createOrderConsumer } from './orderConsumerApp';
import 'reflect-metadata';
import { createApp } from './app';
import { createDataSource } from './shared/database/createDataSource';
import { createRedis, ping } from './services/redis';
import { applySchema } from './shared/database/applySchema';
import { loadAppEnv, requireEnv } from './utils/env';
import { createFinancialConsumer } from './financialConsumerApp';

loadAppEnv();

async function start(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await applySchema(dataSource);

  const redis = createRedis();
  await ping();

  const financialConsumer = createFinancialConsumer(dataSource, redis);
  await financialConsumer.start();
  const orderConsumer = createOrderConsumer(dataSource, redis);
  await orderConsumer.start();

  const app = createApp(dataSource, redis);
  const port = Number(requireEnv('PORT'));
  const server = app.listen(port, () => {
    console.log(`domain listening on ${port}`);
  });

  let stopping = false;
  async function shutdown(): Promise<void> {
    if (stopping) return;
    stopping = true;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await orderConsumer.stop();
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
