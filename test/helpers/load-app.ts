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
    case 'monolith': {
      const app = await import('../../monolith/src/app');
      const database = await import('../../monolith/src/database');
      return { createApp: app.createApp, createDataSource: database.createDataSource };
    }
    case 'mvc': {
      const app = await import('../../mvc/src/app');
      const database = await import('../../mvc/src/database');
      return { createApp: app.createApp, createDataSource: database.createDataSource };
    }
    case 'clean': {
      const app = await import('../../clean/src/app');
      const database = await import('../../clean/src/infrastructure/createDataSource');
      return { createApp: app.createApp, createDataSource: database.createDataSource };
    }
    case 'domain': {
      const app = await import('../../domain/src/app');
      const database = await import('../../domain/src/shared/database/createDataSource');
      return { createApp: app.createApp, createDataSource: database.createDataSource };
    }
    default:
      throw new Error(`Unknown APP_TARGET: ${target}`);
  }
}
