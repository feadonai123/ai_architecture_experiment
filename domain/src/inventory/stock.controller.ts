import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { ListStocksController } from './listStocks/controllers/ListStocksController';
import { GetStockController } from './getStock/controllers/GetStockController';
import { UpdateStockController } from './updateStock/controllers/UpdateStockController';
import { IncreaseStockController } from './increaseStock/controllers/IncreaseStockController';
import { DecreaseStockController } from './decreaseStock/controllers/DecreaseStockController';
export function createStockController(controllers: {
  listStocks: ListStocksController;
  getStock: GetStockController;
  updateStock: UpdateStockController;
  increaseStock: IncreaseStockController;
  decreaseStock: DecreaseStockController;
}): Router {
  const router = Router();
  router.get('/stocks', authenticate, controllers.listStocks.asHandler());
  router.get('/stocks/:productId', authenticate, controllers.getStock.asHandler());
  router.put('/stocks/:productId', authenticate, controllers.updateStock.asHandler());
  router.patch('/stocks/:productId/increase', authenticate, controllers.increaseStock.asHandler());
  router.patch('/stocks/:productId/decrease', authenticate, controllers.decreaseStock.asHandler());
  return router;
}
