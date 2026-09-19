import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { listStocksRoute } from './routes/listStocks.route';
import { getStockRoute } from './routes/getStock.route';
import { updateStockRoute } from './routes/updateStock.route';
import { increaseStockRoute } from './routes/increaseStock.route';
import { decreaseStockRoute } from './routes/decreaseStock.route';
export function createStockController(): Router {
  const router = Router();
  router.get('/stocks', authenticate, listStocksRoute);
  router.get('/stocks/:productId', authenticate, getStockRoute);
  router.put('/stocks/:productId', authenticate, updateStockRoute);
  router.patch('/stocks/:productId/increase', authenticate, increaseStockRoute);
  router.patch('/stocks/:productId/decrease', authenticate, decreaseStockRoute);
  return router;
}
