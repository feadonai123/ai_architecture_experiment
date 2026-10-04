import { Product } from '../../src/models/Product';
import { Product as ProductEntity } from '../../src/entities/Product';

export function mockProductFindById(value: ProductEntity | null) {
  return jest.spyOn(Product, 'findById').mockResolvedValue(value);
}

export function mockProductFindAll(value: ProductEntity[]) {
  return jest.spyOn(Product, 'findAll').mockResolvedValue(value);
}

export function mockProductSave(value?: ProductEntity) {
  return jest.spyOn(Product, 'save').mockImplementation(async (product) => value ?? product);
}
