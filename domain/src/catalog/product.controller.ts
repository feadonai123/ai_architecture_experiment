import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { CreateProductController } from './createProduct/controllers/CreateProductController';
import { DeleteProductController } from './deleteProduct/controllers/DeleteProductController';
import { GetProductController } from './getProduct/controllers/GetProductController';
import { ListProductsController } from './listProducts/controllers/ListProductsController';
import { UpdateProductController } from './updateProduct/controllers/UpdateProductController';

export function createProductController(controllers: {
  listProducts: ListProductsController;
  getProduct: GetProductController;
  createProduct: CreateProductController;
  updateProduct: UpdateProductController;
  deleteProduct: DeleteProductController;
}): Router {
  const router = Router();
  router.get('/products', authenticate, controllers.listProducts.asHandler());
  router.post('/products', authenticate, controllers.createProduct.asHandler());
  router.get('/products/:productId', authenticate, controllers.getProduct.asHandler());
  router.put('/products/:productId', authenticate, controllers.updateProduct.asHandler());
  router.delete('/products/:productId', authenticate, controllers.deleteProduct.asHandler());
  return router;
}
