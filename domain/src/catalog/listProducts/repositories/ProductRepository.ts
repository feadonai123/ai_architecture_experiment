import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { ProductRecord } from '../../../shared/database/ProductRecord';
import { Product } from '../../../shared/entities/Product';

export class ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByFilters(filters: {
    name?: string;
    minPrice?: number;
    maxPrice?: number;
    available?: boolean;
  }): Promise<Product[]> {
    const qb = DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .createQueryBuilder('product')
      .where('product.deleted_at IS NULL')
      .orderBy('product.id', 'ASC');

    if (filters.name) {
      qb.andWhere('LOWER(product.name) LIKE :name', {
        name: `%${filters.name.toLowerCase()}%`,
      });
    }
    if (filters.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }
    if (filters.available === true) {
      qb.andWhere('product.stock > 0');
    }
    if (filters.available === false) {
      qb.andWhere('product.stock = 0');
    }

    const records = await qb.getMany();
    return records.map(
      (record) =>
        new Product(
          record.id,
          record.name,
          record.slug,
          record.description,
          record.price,
          record.stock,
          record.deletedAt,
        ),
    );
  }
}
