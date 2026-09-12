import { Router } from 'express';
import { AddCartItem } from '../../usecases/AddCartItem';
import { CreateCart } from '../../usecases/CreateCart';
import { GetCart } from '../../usecases/GetCart';
import { RemoveCartItem } from '../../usecases/RemoveCartItem';
import { addItem } from './routes/addItem.route';
import { create } from './routes/create.route';
import { removeItem } from './routes/removeItem.route';
import { show } from './routes/show.route';

export function createCartController(deps: {
  createCart: CreateCart;
  getCart: GetCart;
  addCartItem: AddCartItem;
  removeCartItem: RemoveCartItem;
}): Router {
  const router = Router();
  router.post('/cart', create(deps.createCart));
  router.get('/cart/:cartId', show(deps.getCart));
  router.post('/cart/items', addItem(deps.addCartItem));
  router.delete('/cart/items/:productId', removeItem(deps.removeCartItem));
  return router;
}
