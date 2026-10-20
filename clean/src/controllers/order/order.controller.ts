import { ProcessOrderPayment } from '../../usecases/ProcessOrderPayment';
import { ProcessOrderPaymentRoute } from './routes/processPayment.route';
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/authenticate';
import { CreateOrder } from '../../usecases/CreateOrder';
import { CreateOrderRoute } from './routes/create.route';

import { GetOrderStatus } from '../../usecases/GetOrderStatus';
import { GetOrderStatusRoute } from './routes/getStatus.route';

export function createOrderController(
  dataSource: DataSource,
  createOrder: CreateOrder,
  processPayment: ProcessOrderPayment,
  getOrderStatus: GetOrderStatus,
): Router {
  const router = Router();
  router.post('/orders', authenticate, new CreateOrderRoute(dataSource, createOrder).asHandler());
  router.post(
    '/orders/:orderId/payment',
    authenticate,
    new ProcessOrderPaymentRoute(dataSource, processPayment).asHandler(),
  );
  router.get(
    '/orders/:orderId/status',
    authenticate,
    new GetOrderStatusRoute(dataSource, getOrderStatus).asHandler(),
  );
  return router;
}
