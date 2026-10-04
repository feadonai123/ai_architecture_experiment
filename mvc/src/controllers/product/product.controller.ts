import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { createProduct } from './routes/createProduct.route';
import { deleteProduct } from './routes/deleteProduct.route';
import { getProduct } from './routes/getProduct.route';
import { listProducts } from './routes/listProducts.route';
import { updateProduct } from './routes/updateProduct.route';

export function createProductController(): Router {
  const router = Router();
  router.get('/products', authenticate, listProducts);
  router.post('/products', authenticate, createProduct);
  router.get('/products/:productId', authenticate, getProduct);
  router.put('/products/:productId', authenticate, updateProduct);
  router.delete('/products/:productId', authenticate, deleteProduct);
  return router;
}
