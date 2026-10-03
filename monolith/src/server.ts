import 'reflect-metadata';
import { applySchema, createDataSource } from './database';
import { loadAppEnv, requireEnv } from './helpers';
import { createRedis } from './services/redis';

loadAppEnv();

async function start(): Promise<void> {
  const { createApp } = await import('./app');
  const dataSource = createDataSource();
  await dataSource.initialize();
  await applySchema(dataSource);

  const redis = createRedis();
  await redis.ping();

  const app = createApp(dataSource, redis);
  const port = Number(requireEnv('PORT'));
  app.listen(port, () => {
    console.log(`monolith listening on ${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
