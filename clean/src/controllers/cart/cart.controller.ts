import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/authenticate';
import { AddCartItem } from '../../usecases/AddCartItem';
import { CreateCart } from '../../usecases/CreateCart';
import { GetCart } from '../../usecases/GetCart';
import { RemoveCartItem } from '../../usecases/RemoveCartItem';
import { AddItemRoute } from './routes/addItem.route';
import { CreateCartRoute } from './routes/create.route';
import { RemoveItemRoute } from './routes/removeItem.route';
import { ShowCartRoute } from './routes/show.route';

export function createCartController(
  dataSource: DataSource,
  deps: {
    createCart: CreateCart;
    getCart: GetCart;
    addCartItem: AddCartItem;
    removeCartItem: RemoveCartItem;
  },
): Router {
  const router = Router();
  router.post('/cart', authenticate, new CreateCartRoute(dataSource, deps.createCart).asHandler());
  router.get(
    '/cart/:cartId',
    authenticate,
    new ShowCartRoute(dataSource, deps.getCart).asHandler(),
  );
  router.post(
    '/cart/items',
    authenticate,
    new AddItemRoute(dataSource, deps.addCartItem).asHandler(),
  );
  router.delete(
    '/cart/items/:productId',
    authenticate,
    new RemoveItemRoute(dataSource, deps.removeCartItem).asHandler(),
  );
  return router;
}
