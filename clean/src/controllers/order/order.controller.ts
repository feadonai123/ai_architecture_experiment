import { ProcessOrderPayment } from '../../usecases/ProcessOrderPayment';
import { ProcessOrderPaymentRoute } from './routes/processPayment.route';
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/authenticate';
import { CreateOrder } from '../../usecases/CreateOrder';
import { CreateOrderRoute } from './routes/create.route';

export function createOrderController(
  dataSource: DataSource,
  createOrder: CreateOrder,
  processPayment: ProcessOrderPayment,
): Router {
  const router = Router();
  router.post('/orders', authenticate, new CreateOrderRoute(dataSource, createOrder).asHandler());
  router.post(
    '/orders/:orderId/payment',
    authenticate,
    new ProcessOrderPaymentRoute(dataSource, processPayment).asHandler(),
  );
  return router;
}
