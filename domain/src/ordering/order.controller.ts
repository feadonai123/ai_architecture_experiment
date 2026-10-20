import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { CreateOrderController } from './createOrder/controllers/CreateOrderController';

import { GetOrderStatusController } from './getOrderStatus/controllers/GetOrderStatusController';

export function createOrderController(controllers: {
  createOrder: CreateOrderController;
  getOrderStatus: GetOrderStatusController;
}): Router {
  const router = Router();
  router.post('/orders', authenticate, controllers.createOrder.asHandler());
  router.get('/orders/:orderId/status', authenticate, controllers.getOrderStatus.asHandler());
  return router;
}
