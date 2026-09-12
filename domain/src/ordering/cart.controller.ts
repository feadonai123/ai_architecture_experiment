import { Router } from 'express';
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
  router.post('/cart', controllers.createCart.asHandler());
  router.get('/cart/:cartId', controllers.getCart.asHandler());
  router.post('/cart/items', controllers.addCartItem.asHandler());
  router.delete('/cart/items/:productId', controllers.removeCartItem.asHandler());
  return router;
}
