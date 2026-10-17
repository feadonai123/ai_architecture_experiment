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

export function getAppDataSource(): DataSource {
  if (!appDataSource) {
    throw new Error('Application data source has not been started');
  }
  return appDataSource;
}

export function getTestRedis(): Redis {
  if (!redis) {
    throw new Error('Test Redis has not been started');
  }
  return redis;
}

async function clearTestRedis(): Promise<void> {
  const streams = requireEnv('FINANCIAL_CONSUMER_STREAMS')
    .split(',')
    .map((stream) => stream.trim());
  const keys = [
    ...streams,
    requireEnv('FINANCIAL_CONSUMER_DEAD_LETTER_STREAM'),
    requireEnv('FINANCIAL_CONSUMER_RETRY_SCHEDULE_KEY'),
  ];
  const retryPrefix = requireEnv('FINANCIAL_CONSUMER_RETRY_EVENT_KEY_PREFIX');
  let cursor = '0';
  do {
    const [nextCursor, matchedKeys] = await redis.scan(
      cursor,
      'MATCH',
      `${retryPrefix}:*`,
      'COUNT',
      100,
    );
    cursor = nextCursor;
    keys.push(...matchedKeys);
  } while (cursor !== '0');

  if (keys.length > 0) {
    await redis.del(...keys);
  }
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
  await clearTestRedis();
});

afterAll(async () => {
  const stopConsumers = app?.locals.stopConsumers;
  if (typeof stopConsumers === 'function') {
    await stopConsumers();
  }
  if (testDataSource?.isInitialized) {
    await truncateAll(testDataSource);
  }
  if (redis) {
    await clearTestRedis();
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
