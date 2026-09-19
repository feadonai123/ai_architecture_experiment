import fs from 'node:fs';
import path from 'node:path';
import express, { Express } from 'express';
import { createStockController } from './inventory/stock.controller';
import { ListStocks } from './inventory/listStocks/usecases/ListStocks';
import { ProductRepository as ListStocksRepository } from './inventory/listStocks/repositories/ProductRepository';
import { ListStocksController } from './inventory/listStocks/controllers/ListStocksController';
import { GetStock } from './inventory/getStock/usecases/GetStock';
import { ProductRepository as GetStockRepository } from './inventory/getStock/repositories/ProductRepository';
import { GetStockController } from './inventory/getStock/controllers/GetStockController';
import { UpdateStock } from './inventory/updateStock/usecases/UpdateStock';
import { ProductRepository as UpdateStockRepository } from './inventory/updateStock/repositories/ProductRepository';
import { UpdateStockController } from './inventory/updateStock/controllers/UpdateStockController';
import { IncreaseStock } from './inventory/increaseStock/usecases/IncreaseStock';
import { ProductRepository as IncreaseStockRepository } from './inventory/increaseStock/repositories/ProductRepository';
import { IncreaseStockController } from './inventory/increaseStock/controllers/IncreaseStockController';
import { DecreaseStock } from './inventory/decreaseStock/usecases/DecreaseStock';
import { ProductRepository as DecreaseStockRepository } from './inventory/decreaseStock/repositories/ProductRepository';
import { DecreaseStockController } from './inventory/decreaseStock/controllers/DecreaseStockController';
import type Redis from 'ioredis';
import swaggerUi from 'swagger-ui-express';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'yaml';
import { audit } from './middleware/audit';
import { errorHandler } from './middleware/errorHandler';
import { createCartController } from './ordering/cart.controller';
import { AddCartItemController } from './ordering/addCartItem/controllers/AddCartItemController';
import { CartItemRepository as AddCartItemCartItemRepository } from './ordering/addCartItem/repositories/CartItemRepository';
import { CartRepository as AddCartItemCartRepository } from './ordering/addCartItem/repositories/CartRepository';
import { ProductRepository } from './ordering/addCartItem/repositories/ProductRepository';
import { AddCartItem } from './ordering/addCartItem/usecases/AddCartItem';
import { CreateCartController } from './ordering/createCart/controllers/CreateCartController';
import { CartRepository as CreateCartRepository } from './ordering/createCart/repositories/CartRepository';
import { CreateCart } from './ordering/createCart/usecases/CreateCart';
import { GetCartController } from './ordering/getCart/controllers/GetCartController';
import { CartRepository as GetCartRepository } from './ordering/getCart/repositories/CartRepository';
import { GetCart } from './ordering/getCart/usecases/GetCart';
import { RemoveCartItemController } from './ordering/removeCartItem/controllers/RemoveCartItemController';
import { CartItemRepository as RemoveCartItemCartItemRepository } from './ordering/removeCartItem/repositories/CartItemRepository';
import { CartRepository as RemoveCartItemCartRepository } from './ordering/removeCartItem/repositories/CartRepository';
import { RemoveCartItem } from './ordering/removeCartItem/usecases/RemoveCartItem';

function mountSwagger(app: Express): void {
  const specPath = path.resolve(__dirname, '../../docs/openapi.yaml');
  const spec = parse(fs.readFileSync(specPath, 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}

export function createApp(dataSource: DataSource, _redis: Redis): Express {
  const createCart = new CreateCart(new CreateCartRepository(dataSource));
  const getCart = new GetCart(new GetCartRepository(dataSource));
  const addCartItem = new AddCartItem(
    new ProductRepository(dataSource),
    new AddCartItemCartRepository(dataSource),
    new AddCartItemCartItemRepository(dataSource),
    uuidv4,
  );
  const removeCartItem = new RemoveCartItem(
    new RemoveCartItemCartRepository(dataSource),
    new RemoveCartItemCartItemRepository(dataSource),
  );

  const app = express();
  app.use(express.json());
  app.use(audit);
  mountSwagger(app);
  app.use(
    createCartController({
      createCart: new CreateCartController(dataSource, createCart),
      getCart: new GetCartController(dataSource, getCart),
      addCartItem: new AddCartItemController(dataSource, addCartItem),
      removeCartItem: new RemoveCartItemController(dataSource, removeCartItem),
    }),
  );
  app.use(
    createStockController({
      listStocks: new ListStocksController(
        dataSource,
        new ListStocks(new ListStocksRepository(dataSource)),
      ),
      getStock: new GetStockController(
        dataSource,
        new GetStock(new GetStockRepository(dataSource)),
      ),
      updateStock: new UpdateStockController(
        dataSource,
        new UpdateStock(new UpdateStockRepository(dataSource)),
      ),
      increaseStock: new IncreaseStockController(
        dataSource,
        new IncreaseStock(new IncreaseStockRepository(dataSource)),
      ),
      decreaseStock: new DecreaseStockController(
        dataSource,
        new DecreaseStock(new DecreaseStockRepository(dataSource)),
      ),
    }),
  );
  app.use(errorHandler);
  return app;
}
