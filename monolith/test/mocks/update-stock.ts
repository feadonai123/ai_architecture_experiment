export const productMock = {
  id: 'product-1',
  name: 'Tea',
  description: '',
  price: 10,
  stock: 10,
};

export const missingProductMock = {
  ...productMock,
  id: 'missing-product',
  name: 'Missing',
};

export const invalidAbsoluteQuantityMock = -1;
export const updateQuantityMock = 25;
