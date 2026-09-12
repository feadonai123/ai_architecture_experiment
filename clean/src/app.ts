import express, { Express } from 'express';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createCartController } from './controllers/cart/cart.controller';
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

export function createApp(dataSource: DataSource, _redis: Redis): Express {
  const products = new TypeOrmProductRepository(dataSource);
  const carts = new TypeOrmCartRepository(dataSource);
  const cartItems = new TypeOrmCartItemRepository(dataSource);

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
  app.use(errorHandler);
  return app;
}
