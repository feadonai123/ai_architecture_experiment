import { Cart } from '../../src/models/Cart';
import { Cart as CartEntity } from '../../src/entities/Cart';

export function mockCartCreateEmpty(value: CartEntity) {
  return jest.spyOn(Cart, 'createEmpty').mockResolvedValue(value);
}

export function mockCartFindById(value: CartEntity | null) {
  return jest.spyOn(Cart, 'findById').mockResolvedValue(value);
}

export function mockCartFindWithItems(value: CartEntity | null) {
  return jest.spyOn(Cart, 'findWithItems').mockResolvedValue(value);
}
