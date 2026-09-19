import { getDataSource } from '../database';
import { Product as ProductEntity } from '../entities/Product';

export class Product {
  static findAll(): Promise<ProductEntity[]> {
    return getDataSource()
      .getRepository(ProductEntity)
      .find({ order: { id: 'ASC' } });
  }

  static save(product: ProductEntity): Promise<ProductEntity> {
    return getDataSource().getRepository(ProductEntity).save(product);
  }

  static findById(id: string): Promise<ProductEntity | null> {
    return getDataSource().getRepository(ProductEntity).findOne({ where: { id } });
  }
}
