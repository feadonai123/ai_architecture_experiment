import express, { Express } from 'express';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { mountSwagger } from './helpers';
import { authenticate } from './middleware/authenticate';
import { audit } from './middleware/audit';
import { errorHandler } from './middleware/errorHandler';
import { addCartItemRoute } from './routes/addCartItem';
import { createCartRoute } from './routes/createCart';
import { getCartRoute } from './routes/getCart';
import { removeCartItemRoute } from './routes/removeCartItem';

export function createApp(dataSource: DataSource, _redis: Redis): Express {
  const app = express();
  app.use(express.json());
  app.use(audit);
  app.use(authenticate);
  mountSwagger(app);

  app.post('/cart', createCartRoute(dataSource));
  app.get('/cart/:cartId', getCartRoute(dataSource));
  app.post('/cart/items', addCartItemRoute(dataSource));
  app.delete('/cart/items/:productId', removeCartItemRoute(dataSource));

  app.use(errorHandler);
  return app;
}
