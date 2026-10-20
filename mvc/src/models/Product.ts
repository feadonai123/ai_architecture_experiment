import { EntityManager, In, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from '../database';
import { Product as ProductEntity } from '../entities/Product';

export type ProductFilters = {
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
};

export class Product {
  static findAll(): Promise<ProductEntity[]> {
    return getDataSource()
      .getRepository(ProductEntity)
      .find({ where: { deletedAt: IsNull() }, order: { id: 'ASC' } });
  }

  static save(
    product: ProductEntity,
    manager: EntityManager = getDataSource().manager,
  ): Promise<ProductEntity> {
    return manager.getRepository(ProductEntity).save(product);
  }

  static findById(id: string): Promise<ProductEntity | null> {
    return getDataSource()
      .getRepository(ProductEntity)
      .findOne({ where: { id, deletedAt: IsNull() } });
  }

  static findBySlug(slug: string): Promise<ProductEntity | null> {
    return getDataSource().getRepository(ProductEntity).findOne({ where: { slug } });
  }

  static findByFilters(filters: ProductFilters): Promise<ProductEntity[]> {
    const qb = getDataSource()
      .getRepository(ProductEntity)
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

    return qb.getMany();
  }

  static create(input: {
    name: string;
    slug: string;
    description: string;
    price: number;
  }): Promise<ProductEntity> {
    const repository = getDataSource().getRepository(ProductEntity);
    const product = repository.create({
      id: uuidv4(),
      name: input.name,
      slug: input.slug,
      description: input.description,
      price: input.price,
      stock: 0,
      deletedAt: null,
    });
    return repository.save(product);
  }

  static async softDelete(
    product: ProductEntity,
    manager: EntityManager = getDataSource().manager,
  ): Promise<ProductEntity> {
    product.deletedAt = new Date();
    return Product.save(product, manager);
  }

  static findByIdForUpdate(
    id: string,
    manager: EntityManager,
    includeDeleted = false,
  ): Promise<ProductEntity | null> {
    return manager.getRepository(ProductEntity).findOne({
      where: includeDeleted ? { id } : { id, deletedAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
  }

  static async findByIdsForUpdate(ids: string[], manager: EntityManager): Promise<ProductEntity[]> {
    const products: ProductEntity[] = [];
    for (const id of [...ids].sort()) {
      const product = await Product.findByIdForUpdate(id, manager);
      if (product) products.push(product);
    }
    return products;
  }

  static findByIds(ids: string[]): Promise<ProductEntity[]> {
    return getDataSource()
      .getRepository(ProductEntity)
      .find({ where: { id: In(ids) } });
  }
}
