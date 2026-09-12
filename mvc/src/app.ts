import fs from 'node:fs';
import path from 'node:path';
import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { parse } from 'yaml';
import { createCartController } from './controllers/cart/cart.controller';
import { setDataSource } from './database';
import { audit } from './middleware/audit';
import { errorHandler } from './middleware/errorHandler';

function mountSwagger(app: Express): void {
  const specPath = path.resolve(__dirname, '../../docs/openapi.yaml');
  const spec = parse(fs.readFileSync(specPath, 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}

export function createApp(dataSource: DataSource, _redis: Redis): Express {
  setDataSource(dataSource);
  const app = express();
  app.use(express.json());
  app.use(audit);
  mountSwagger(app);
  app.use(createCartController());
  app.use(errorHandler);
  return app;
}
