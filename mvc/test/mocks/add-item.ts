import { Cart } from '../../src/entities/Cart';
import { CartItem } from '../../src/entities/CartItem';
import { Product } from '../../src/entities/Product';

export const productMock = {
  id: 'product-1',
  name: 'Tea',
  slug: 'tea',
  description: '',
  price: 10,
  stock: 10,
} as Product;

export const cartMock = {
  id: 'cart-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  items: [],
} as Cart;

export const itemMock = {
  id: 'item-1',
  cartId: cartMock.id,
  productId: productMock.id,
  quantity: 2,
} as CartItem;

export const incrementedItemMock = {
  ...itemMock,
  quantity: 5,
} as CartItem;

export const existingItemMock = {
  ...itemMock,
} as CartItem;

export const cartWithItemMock = {
  ...cartMock,
  items: [itemMock],
} as Cart;

export const cartWithIncrementedItemMock = {
  ...cartMock,
  items: [incrementedItemMock],
} as Cart;

export const lowStockProductMock = {
  ...productMock,
  stock: 2,
} as Product;

export const missingCartMock = {
  ...cartMock,
  id: 'missing-cart',
} as Cart;

export const missingProductMock = {
  ...productMock,
  id: 'missing-product',
  name: 'Missing',
  slug: 'missing',
} as Product;

export const itemResponseMock = {
  id: itemMock.id,
  productId: itemMock.productId,
  quantity: itemMock.quantity,
};

export const incrementedItemResponseMock = {
  id: incrementedItemMock.id,
  productId: incrementedItemMock.productId,
  quantity: incrementedItemMock.quantity,
};

export const invalidQuantityMock = 0;
export const incrementQuantityMock = 3;
export const exceedingQuantityMock = 5;
