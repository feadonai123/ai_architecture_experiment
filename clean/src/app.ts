import express, { Express } from 'express';
import { createStockController } from './controllers/stock/stock.controller';
import { ListStocks } from './usecases/ListStocks';
import { GetStock } from './usecases/GetStock';
import { UpdateStock } from './usecases/UpdateStock';
import { IncreaseStock } from './usecases/IncreaseStock';
import { DecreaseStock } from './usecases/DecreaseStock';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createCartController } from './controllers/cart/cart.controller';
import { createOrderController } from './controllers/order/order.controller';
import { audit } from './middleware/audit';
import { errorHandler } from './middleware/errorHandler';
import { mountSwagger } from './infrastructure/swagger';
import { TypeOrmCartItemRepository } from './repositories/TypeOrmCartItemRepository';
import { TypeOrmCartRepository } from './repositories/TypeOrmCartRepository';
import { TypeOrmProductRepository } from './repositories/TypeOrmProductRepository';
import { AddCartItem } from './usecases/AddCartItem';
import { CreateCart } from './usecases/CreateCart';
import { GetCart } from './usecases/GetCart';
import { RemoveCartItem } from './usecases/RemoveCartItem';
import { TypeOrmUserRepository } from './repositories/TypeOrmUserRepository';
import { TypeOrmOrderRepository } from './repositories/TypeOrmOrderRepository';
import { TypeOrmOrderItemRepository } from './repositories/TypeOrmOrderItemRepository';
import { EventRedisService } from './services/EventRedisService';
import { CreateOrder } from './usecases/CreateOrder';

export function createApp(dataSource: DataSource, redis: Redis): Express {
  const products = new TypeOrmProductRepository(dataSource);
  const carts = new TypeOrmCartRepository(dataSource);
  const cartItems = new TypeOrmCartItemRepository(dataSource);
  const users = new TypeOrmUserRepository(dataSource);
  const orders = new TypeOrmOrderRepository(dataSource);
  const orderItems = new TypeOrmOrderItemRepository(dataSource);
  const events = new EventRedisService(redis);

  const createCart = new CreateCart(carts);
  const getCart = new GetCart(carts);
  const addCartItem = new AddCartItem(products, carts, cartItems, uuidv4);
  const removeCartItem = new RemoveCartItem(carts, cartItems);

  const app = express();
  app.use(express.json());
  app.use(audit);
  mountSwagger(app);
  app.use(
    createCartController(dataSource, {
      createCart,
      getCart,
      addCartItem,
      removeCartItem,
    }),
  );
  app.use(
    createOrderController(
      dataSource,
      new CreateOrder(users, products, orders, orderItems, events, uuidv4, () => new Date()),
    ),
  );
  app.use(
    createStockController(dataSource, {
      listStocks: new ListStocks(products),
      getStock: new GetStock(products),
      updateStock: new UpdateStock(products),
      increaseStock: new IncreaseStock(products),
      decreaseStock: new DecreaseStock(products),
    }),
  );
  app.use(errorHandler);
  return app;
}
