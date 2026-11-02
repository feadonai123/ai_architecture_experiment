import type { Express } from 'express';
import type { DataSource } from 'typeorm';
import { requireEnv } from './env';

export type AppBoot = {
  createApp: (dataSource: DataSource, redis: import('ioredis').default) => Express;
  createDataSource: () => DataSource;
};

export async function loadAppModule(): Promise<AppBoot> {
  const target = requireEnv('APP_TARGET');

  switch (target) {
    case 'clean': {
      const app = await import('../../clean/src/app');
      const database = await import('../../clean/src/infrastructure/createDataSource');
      return { createApp: app.createApp, createDataSource: database.createDataSource };
    }
    default:
      throw new Error(`Unknown APP_TARGET: ${target}`);
  }
}
