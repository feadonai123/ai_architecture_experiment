import { processPayment } from './routes/processPayment.route';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { create } from './routes/create.route';

export function createOrderController(): Router {
  const router = Router();
  router.post('/orders', authenticate, create);
  router.post('/orders/:orderId/payment', authenticate, processPayment);
  return router;
}
