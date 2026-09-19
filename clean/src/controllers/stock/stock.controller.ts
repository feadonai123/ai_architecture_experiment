import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/authenticate';
import { ListStocks } from '../../usecases/ListStocks';
import { ListStocksRoute } from './routes/listStocks.route';
import { GetStock } from '../../usecases/GetStock';
import { GetStockRoute } from './routes/getStock.route';
import { UpdateStock } from '../../usecases/UpdateStock';
import { UpdateStockRoute } from './routes/updateStock.route';
import { IncreaseStock } from '../../usecases/IncreaseStock';
import { IncreaseStockRoute } from './routes/increaseStock.route';
import { DecreaseStock } from '../../usecases/DecreaseStock';
import { DecreaseStockRoute } from './routes/decreaseStock.route';
export function createStockController(
  dataSource: DataSource,
  deps: {
    listStocks: ListStocks;
    getStock: GetStock;
    updateStock: UpdateStock;
    increaseStock: IncreaseStock;
    decreaseStock: DecreaseStock;
  },
): Router {
  const router = Router();
  router.get('/stocks', authenticate, new ListStocksRoute(dataSource, deps.listStocks).asHandler());
  router.get(
    '/stocks/:productId',
    authenticate,
    new GetStockRoute(dataSource, deps.getStock).asHandler(),
  );
  router.put(
    '/stocks/:productId',
    authenticate,
    new UpdateStockRoute(dataSource, deps.updateStock).asHandler(),
  );
  router.patch(
    '/stocks/:productId/increase',
    authenticate,
    new IncreaseStockRoute(dataSource, deps.increaseStock).asHandler(),
  );
  router.patch(
    '/stocks/:productId/decrease',
    authenticate,
    new DecreaseStockRoute(dataSource, deps.decreaseStock).asHandler(),
  );
  return router;
}
