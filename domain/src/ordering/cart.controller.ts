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
  router.post('/cart', controllers.createCart.handle);
  router.get('/cart/:cartId', controllers.getCart.handle);
  router.post('/cart/items', controllers.addCartItem.handle);
  router.delete('/cart/items/:productId', controllers.removeCartItem.handle);
  return router;
}
