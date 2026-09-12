import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { addItem } from './routes/addItem.route';
import { create } from './routes/create.route';
import { removeItem } from './routes/removeItem.route';
import { show } from './routes/show.route';

export function createCartController(): Router {
  const router = Router();
  router.post('/cart', authenticate, create);
  router.get('/cart/:cartId', authenticate, show);
  router.post('/cart/items', authenticate, addItem);
  router.delete('/cart/items/:productId', authenticate, removeItem);
  return router;
}
