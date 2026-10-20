import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { ProcessOrderPaymentController } from './processOrderPayment/controllers/ProcessOrderPaymentController';
export function createPaymentController(controller: ProcessOrderPaymentController): Router {
  const router = Router();
  router.post('/orders/:orderId/payment', authenticate, controller.asHandler());
  return router;
}
