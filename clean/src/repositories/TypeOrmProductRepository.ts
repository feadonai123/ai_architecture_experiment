import { DataSource, IsNull } from 'typeorm';
import { DbManager } from '../manager/db.manager';
import { Product } from '../entities/Product';
import { ProductRecord } from '../infrastructure/typeorm/ProductRecord';
import { ProductFilters, ProductRepository } from '../ports/ProductRepository';

function toProduct(record: ProductRecord): Product {
  return new Product(
    record.id,
    record.name,
    record.slug,
    record.description,
    record.price,
    record.stock,
    record.deletedAt,
  );
}

export class TypeOrmProductRepository implements ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(): Promise<Product[]> {
    const records = await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .find({ where: { deletedAt: IsNull() }, order: { id: 'ASC' } });
    return records.map(toProduct);
  }

  async save(product: Product): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .save({ ...product });
  }

  async create(product: Product): Promise<void> {
    await this.save(product);
  }

  async softDelete(product: Product): Promise<void> {
    await this.save(product);
  }

  async findById(id: string): Promise<Product | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .findOne({ where: { id, deletedAt: IsNull() } });
    if (!record) {
      return null;
    }
    return toProduct(record);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .findOne({ where: { slug } });
    if (!record) {
      return null;
    }
    return toProduct(record);
  }

  async findByFilters(filters: ProductFilters): Promise<Product[]> {
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
    return records.map(toProduct);
  }
}
