export const productMock = {
  id: 'product-1',
  name: 'Tea',
  slug: 'tea',
  description: '',
  price: 10,
  stock: 10,
};

export const cartMock = {
  id: 'cart-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  items: [] as Array<{ id: string; cartId: string; productId: string; quantity: number }>,
};

export const itemMock = {
  id: 'item-1',
  cartId: cartMock.id,
  productId: productMock.id,
  quantity: 2,
};

export const cartWithItemsMock = {
  ...cartMock,
  items: [itemMock],
};

export const missingCartMock = {
  ...cartMock,
  id: 'missing-cart',
};
