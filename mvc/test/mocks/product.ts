import { Product } from '../../src/models/Product';
import { Product as ProductEntity } from '../../src/entities/Product';

export function mockProductFindById(value: ProductEntity | null) {
  return jest.spyOn(Product, 'findById').mockResolvedValue(value);
}

export function mockProductFindByIds(value: ProductEntity[]) {
  return jest.spyOn(Product, 'findByIds').mockResolvedValue(value);
}
export function mockProductFindBySlug(value: ProductEntity | null) {
  return jest.spyOn(Product, 'findBySlug').mockResolvedValue(value);
}

export function mockProductFindAll(value: ProductEntity[]) {
  return jest.spyOn(Product, 'findAll').mockResolvedValue(value);
}

export function mockProductFindByFilters(value: ProductEntity[]) {
  return jest.spyOn(Product, 'findByFilters').mockResolvedValue(value);
}

export function mockProductSave(value?: ProductEntity) {
  return jest.spyOn(Product, 'save').mockImplementation(async (product) => value ?? product);
}

export function mockProductCreate(value: ProductEntity) {
  return jest.spyOn(Product, 'create').mockResolvedValue(value);
}

export function mockProductSoftDelete(value?: ProductEntity) {
  return jest.spyOn(Product, 'softDelete').mockImplementation(async (product) => {
    product.deletedAt = new Date();
    return value ?? product;
  });
}
