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
