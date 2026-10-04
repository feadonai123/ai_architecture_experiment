import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Express, NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadAppEnv(): void {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

export function isValidQuantity(quantity: unknown): quantity is number {
  return typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0;
}

export function isValidName(name: unknown): name is string {
  return typeof name === 'string' && name.trim().length > 0;
}

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && slug.trim().length > 0;
}

export function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price >= 0;
}

export function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return null;
}

export function parseOptionalBoolean(value: unknown): boolean | undefined | 'invalid' {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return 'invalid';
}

export function wrap(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export function mountSwagger(app: Express): void {
  const specPath = path.resolve(__dirname, '../../docs/openapi.yaml');
  const spec = parse(fs.readFileSync(specPath, 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
