import { Cart } from '../../src/entities/Cart';
import { CartItem } from '../../src/entities/CartItem';
import { Product } from '../../src/entities/Product';

export const productMock = {
  id: 'product-1',
  name: 'Tea',
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
  quantity: 1,
} as CartItem;

export const missingCartMock = {
  ...cartMock,
  id: 'missing-cart',
} as Cart;

export const missingProductMock = {
  ...productMock,
  id: 'missing-product',
  name: 'Missing',
} as Product;
