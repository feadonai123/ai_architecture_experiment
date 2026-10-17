import 'reflect-metadata';
import { applySchema, createDataSource } from './database';
import { loadAppEnv, requireEnv } from './helpers';
import { createRedis } from './services/redis';

loadAppEnv();

async function start(): Promise<void> {
  const { createApp } = await import('./app');
  const { createFinancialConsumer } = await import('./financialConsumerApp');
  const dataSource = createDataSource();
  await dataSource.initialize();
  await applySchema(dataSource);

  const redis = createRedis();
  await redis.ping();

  const financialConsumer = createFinancialConsumer(dataSource, redis);
  await financialConsumer.start();
  const app = createApp(dataSource, redis);
  const port = Number(requireEnv('PORT'));
  const server = app.listen(port, () => {
    console.log(`monolith listening on ${port}`);
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
