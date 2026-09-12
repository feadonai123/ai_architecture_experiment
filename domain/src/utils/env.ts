import path from 'node:path';
import dotenv from 'dotenv';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadAppEnv(): void {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}
