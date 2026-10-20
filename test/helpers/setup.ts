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
  const keys: string[] = [];
  for (const prefix of ['FINANCIAL_CONSUMER', 'ORDER_CONSUMER']) {
    keys.push(
      ...requireEnv(prefix + '_STREAMS')
        .split(',')
        .map((s) => s.trim()),
      requireEnv(prefix + '_DEAD_LETTER_STREAM'),
      requireEnv(prefix + '_RETRY_SCHEDULE_KEY'),
    );
    let cursor = '0';
    do {
      const [next, matches] = await redis.scan(
        cursor,
        'MATCH',
        requireEnv(prefix + '_RETRY_EVENT_KEY_PREFIX') + ':*',
        'COUNT',
        100,
      );
      cursor = next;
      keys.push(...matches);
    } while (cursor !== '0');
  }
  if (keys.length) await redis.del(...new Set(keys));
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
