import { getDataSource } from '../database';
import { Product as ProductEntity } from '../entities/Product';

export class Product {
  static findById(id: string): Promise<ProductEntity | null> {
    return getDataSource().getRepository(ProductEntity).findOne({ where: { id } });
  }
}
