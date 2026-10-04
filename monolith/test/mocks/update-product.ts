export const productMock = {
  id: 'product-1',
  name: 'Tea',
  description: '',
  price: 10,
  stock: 10,
};

export const updatedCatalogProductMock = {
  ...productMock,
  name: 'Green Tea',
  description: 'Leaf',
  price: 12,
};

export const missingProductMock = {
  ...productMock,
  id: 'missing-product',
  name: 'Missing',
};
