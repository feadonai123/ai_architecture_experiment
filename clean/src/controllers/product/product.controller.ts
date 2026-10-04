import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/authenticate';
import { CreateProduct } from '../../usecases/CreateProduct';
import { DeleteProduct } from '../../usecases/DeleteProduct';
import { GetProduct } from '../../usecases/GetProduct';
import { ListProducts } from '../../usecases/ListProducts';
import { UpdateProduct } from '../../usecases/UpdateProduct';
import { CreateProductRoute } from './routes/createProduct.route';
import { DeleteProductRoute } from './routes/deleteProduct.route';
import { GetProductRoute } from './routes/getProduct.route';
import { ListProductsRoute } from './routes/listProducts.route';
import { UpdateProductRoute } from './routes/updateProduct.route';

export function createProductController(
  dataSource: DataSource,
  deps: {
    listProducts: ListProducts;
    getProduct: GetProduct;
    createProduct: CreateProduct;
    updateProduct: UpdateProduct;
    deleteProduct: DeleteProduct;
  },
): Router {
  const router = Router();
  router.get(
    '/products',
    authenticate,
    new ListProductsRoute(dataSource, deps.listProducts).asHandler(),
  );
  router.post(
    '/products',
    authenticate,
    new CreateProductRoute(dataSource, deps.createProduct).asHandler(),
  );
  router.get(
    '/products/:productId',
    authenticate,
    new GetProductRoute(dataSource, deps.getProduct).asHandler(),
  );
  router.put(
    '/products/:productId',
    authenticate,
    new UpdateProductRoute(dataSource, deps.updateProduct).asHandler(),
  );
  router.delete(
    '/products/:productId',
    authenticate,
    new DeleteProductRoute(dataSource, deps.deleteProduct).asHandler(),
  );
  return router;
}
