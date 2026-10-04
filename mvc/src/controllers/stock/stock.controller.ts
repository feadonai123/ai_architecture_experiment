import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { decreaseStock } from './routes/decreaseStock.route';
import { getStock } from './routes/getStock.route';
import { increaseStock } from './routes/increaseStock.route';
import { listStocks } from './routes/listStocks.route';
import { updateStock } from './routes/updateStock.route';

export function createStockController(): Router {
  const router = Router();
  router.get('/stocks', authenticate, listStocks);
  router.get('/stocks/:productId', authenticate, getStock);
  router.put('/stocks/:productId', authenticate, updateStock);
  router.patch('/stocks/:productId/increase', authenticate, increaseStock);
  router.patch('/stocks/:productId/decrease', authenticate, decreaseStock);
  return router;
}
