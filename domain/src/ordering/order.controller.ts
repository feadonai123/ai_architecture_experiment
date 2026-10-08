import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { CreateOrderController } from './createOrder/controllers/CreateOrderController';

export function createOrderController(controllers: {
  createOrder: CreateOrderController;
}): Router {
  const router = Router();
  router.post('/orders', authenticate, controllers.createOrder.asHandler());
  return router;
}
