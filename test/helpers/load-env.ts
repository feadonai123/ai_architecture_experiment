import path from 'node:path';
import dotenv from 'dotenv';
import { requireEnv } from './env';

const root = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.test'), override: true });

export function assertTestDatabase(): void {
  const url = `postgres://${requireEnv('POSTGRES_HOST')}:${requireEnv('POSTGRES_PORT')}/${requireEnv('POSTGRES_DB')}`;
  if (!url.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to run tests against non-test database. URL must contain "test". Got: ${url}`,
    );
  }
}

assertTestDatabase();
