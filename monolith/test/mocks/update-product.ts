export const productMock = {
  id: 'product-1',
  name: 'Tea',
  slug: 'tea',
  description: '',
  price: 10,
  stock: 10,
};

export const updatedCatalogProductMock = {
  ...productMock,
  name: 'Green Tea',
  slug: 'green-tea',
  description: 'Leaf',
  price: 12,
};

export const missingProductMock = {
  ...productMock,
  id: 'missing-product',
  name: 'Missing',
  slug: 'missing',
};
