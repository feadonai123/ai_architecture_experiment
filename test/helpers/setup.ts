import type { Express } from 'express';
import Redis from 'ioredis';
import type { DataSource } from 'typeorm';
import { requireEnv } from './env';
import { loadAppModule } from './load-app';
import { createTestDataSource } from '../persistence/create-test-data-source';
import { applySchema, truncateAll } from './schema';

let app: Express;
let appDataSource: DataSource;
let testDataSource: DataSource;
let redis: Redis;

export function getApp(): Express {
  if (!app) {
    throw new Error('Test app has not been started');
  }
  return app;
}

export function getTestDataSource(): DataSource {
  if (!testDataSource) {
    throw new Error('Test data source has not been started');
  }
  return testDataSource;
}

async function initializeWithRetry(dataSource: DataSource): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

beforeAll(async () => {
  const boot = await loadAppModule();
  appDataSource = boot.createDataSource();
  testDataSource = createTestDataSource();

  await initializeWithRetry(appDataSource);
  await initializeWithRetry(testDataSource);
  await applySchema(testDataSource);

  redis = new Redis(requireEnv('REDIS_URL'));
  await redis.ping();

  app = boot.createApp(appDataSource, redis);
}, 60000);

beforeEach(async () => {
  await truncateAll(testDataSource);
});

afterAll(async () => {
  if (testDataSource?.isInitialized) {
    await truncateAll(testDataSource);
  }
  if (appDataSource?.isInitialized) {
    await appDataSource.destroy();
  }
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
  }
  if (redis) {
    await redis.quit();
  }
});
