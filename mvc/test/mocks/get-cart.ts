import { Cart } from '../../src/entities/Cart';
import { CartItem } from '../../src/entities/CartItem';
import { Product } from '../../src/entities/Product';

export const productMock = {
  id: 'product-1',
  name: 'Tea',
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

export const cartWithItemsMock = {
  ...cartMock,
  items: [itemMock],
} as Cart;

export const itemResponseMock = {
  id: itemMock.id,
  productId: itemMock.productId,
  quantity: itemMock.quantity,
};

export const missingCartMock = {
  ...cartMock,
  id: 'missing-cart',
} as Cart;
