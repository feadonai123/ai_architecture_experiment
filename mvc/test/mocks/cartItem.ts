import { CartItem } from '../../src/models/CartItem';
import { CartItem as CartItemEntity } from '../../src/entities/CartItem';

export function mockCartItemFindByCartAndProduct(value: CartItemEntity | null) {
  return jest.spyOn(CartItem, 'findByCartAndProduct').mockResolvedValue(value);
}

export function mockCartItemCreateItem(value: CartItemEntity) {
  return jest.spyOn(CartItem, 'createItem').mockResolvedValue(value);
}

export function mockCartItemSave(value: CartItemEntity) {
  return jest.spyOn(CartItem, 'save').mockResolvedValue(value);
}

export function mockCartItemRemove() {
  return jest.spyOn(CartItem, 'remove').mockResolvedValue(undefined);
}
