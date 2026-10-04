export const productMock = {
  id: 'product-1',
  name: 'Tea',
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
  quantity: 1,
};

export const missingCartMock = {
  ...cartMock,
  id: 'missing-cart',
};

export const missingProductMock = {
  ...productMock,
  id: 'missing-product',
  name: 'Missing',
};
