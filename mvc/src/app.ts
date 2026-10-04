import fs from 'node:fs';
import path from 'node:path';
import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { parse } from 'yaml';
import { createCartController } from './controllers/cart/cart.controller';
import { ConsumerFinancial } from './consumers/ConsumerFinancial';
import { createOrderController } from './controllers/order/order.controller';
import { createProductController } from './controllers/product/product.controller';
import { createStockController } from './controllers/stock/stock.controller';
import { setDataSource } from './database';
import { audit } from './middleware/audit';
import { errorHandler } from './middleware/errorHandler';
import { setRedis } from './services/redis';

function mountSwagger(app: Express): void {
  const specPath = path.resolve(__dirname, '../../docs/openapi.yaml');
  const spec = parse(fs.readFileSync(specPath, 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}

export function createApp(dataSource: DataSource, redis: Redis): Express {
  setDataSource(dataSource);
  setRedis(redis);
  const app = express();
  const financialConsumer = new ConsumerFinancial(redis);
  financialConsumer.start();
  app.locals.stopConsumers = () => financialConsumer.stop();
  app.use(express.json());
  app.use(audit);
  mountSwagger(app);
  app.use(createCartController());
  app.use(createStockController());
  app.use(createOrderController());
  app.use(createProductController());
  app.use(errorHandler);
  return app;
}
