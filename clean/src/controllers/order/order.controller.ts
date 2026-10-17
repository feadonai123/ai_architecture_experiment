import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/authenticate';
import { CreateOrder } from '../../usecases/CreateOrder';
import { CreateOrderRoute } from './routes/create.route';

export function createOrderController(dataSource: DataSource, createOrder: CreateOrder): Router {
  const router = Router();
  router.post('/orders', authenticate, new CreateOrderRoute(dataSource, createOrder).asHandler());
  return router;
}
