import { Cart } from '../../src/entities/Cart';

export const cartMock = {
  id: 'cart-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  items: [],
} as Cart;

export const createdCartResponseMock = {
  id: cartMock.id,
  createdAt: cartMock.createdAt.toISOString(),
  items: cartMock.items,
};
