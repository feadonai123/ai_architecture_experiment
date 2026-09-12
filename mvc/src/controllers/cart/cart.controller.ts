import { Router } from 'express';
import { addItem } from './routes/addItem.route';
import { create } from './routes/create.route';
import { removeItem } from './routes/removeItem.route';
import { show } from './routes/show.route';

export function createCartController(): Router {
  const router = Router();
  router.post('/cart', create);
  router.get('/cart/:cartId', show);
  router.post('/cart/items', addItem);
  router.delete('/cart/items/:productId', removeItem);
  return router;
}
