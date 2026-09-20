import express, { Express } from 'express';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { mountSwagger } from './helpers';
import { authenticate } from './middleware/authenticate';
import { audit } from './middleware/audit';
import { errorHandler } from './middleware/errorHandler';
import { addCartItemRoute } from './routes/addCartItem';
import { createCartRoute } from './routes/createCart';
import { createOrderRoute } from './routes/createOrder';
import { decreaseStockRoute } from './routes/decreaseStock';
import { getCartRoute } from './routes/getCart';
import { getStockRoute } from './routes/getStock';
import { increaseStockRoute } from './routes/increaseStock';
import { listStocksRoute } from './routes/listStocks';
import { removeCartItemRoute } from './routes/removeCartItem';
import { updateStockRoute } from './routes/updateStock';

export function createApp(dataSource: DataSource, _redis: Redis): Express {
  const app = express();
  app.use(express.json());
  app.use(audit);
  mountSwagger(app);

  app.post('/cart', authenticate, createCartRoute(dataSource));
  app.get('/cart/:cartId', authenticate, getCartRoute(dataSource));
  app.post('/cart/items', authenticate, addCartItemRoute(dataSource));
  app.delete('/cart/items/:productId', authenticate, removeCartItemRoute(dataSource));
  app.post('/orders', authenticate, createOrderRoute(dataSource));
  app.get('/stocks', authenticate, listStocksRoute(dataSource));
  app.get('/stocks/:productId', authenticate, getStockRoute(dataSource));
  app.put('/stocks/:productId', authenticate, updateStockRoute(dataSource));
  app.patch('/stocks/:productId/increase', authenticate, increaseStockRoute(dataSource));
  app.patch('/stocks/:productId/decrease', authenticate, decreaseStockRoute(dataSource));

  app.use(errorHandler);
  return app;
}
