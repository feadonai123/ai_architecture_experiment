import 'reflect-metadata';
import { createApp } from './app';
import { applySchema, createDataSource } from './database';
import { createFinancialConsumer } from './financialConsumerApp';
import { ping, createRedis } from './services/redis';
import { loadAppEnv, requireEnv } from './utils/env';

loadAppEnv();

async function start(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await applySchema(dataSource);

  const redis = createRedis();
  await ping();

  const financialConsumer = createFinancialConsumer(redis);
  await financialConsumer.start();
  const app = createApp(dataSource, redis);
  const port = Number(requireEnv('PORT'));
  const server = app.listen(port, () => {
    console.log(`mvc listening on ${port}`);
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
