import { Product } from '../entities/Product';
export function presentProduct(product: Product) {
  return { id: product.id, name: product.name, price: product.price, stock: product.stock };
}
