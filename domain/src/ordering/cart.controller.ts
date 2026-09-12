import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { AddCartItemController } from './addCartItem/controllers/AddCartItemController';
import { CreateCartController } from './createCart/controllers/CreateCartController';
import { GetCartController } from './getCart/controllers/GetCartController';
import { RemoveCartItemController } from './removeCartItem/controllers/RemoveCartItemController';

export function createCartController(controllers: {
  createCart: CreateCartController;
  getCart: GetCartController;
  addCartItem: AddCartItemController;
  removeCartItem: RemoveCartItemController;
}): Router {
  const router = Router();
  router.post('/cart', authenticate, controllers.createCart.asHandler());
  router.get('/cart/:cartId', authenticate, controllers.getCart.asHandler());
  router.post('/cart/items', authenticate, controllers.addCartItem.asHandler());
  router.delete('/cart/items/:productId', authenticate, controllers.removeCartItem.asHandler());
  return router;
}
