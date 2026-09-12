import 'reflect-metadata';
import { createApp } from './app';
import { applySchema, createDataSource } from './database';
import { ping, createRedis } from './services/redis';
import { loadAppEnv, requireEnv } from './utils/env';

loadAppEnv();

async function start(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await applySchema(dataSource);

  const redis = createRedis();
  await ping();

  const app = createApp(dataSource, redis);
  const port = Number(requireEnv('PORT'));
  app.listen(port, () => {
    console.log(`mvc listening on ${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
