import { Product } from '../../src/entities/Product';

export const productMock = new Product('product-1', 'Tea', 'tea', '', 10, 10);
export const updatedCatalogProductMock = new Product(
  productMock.id,
  'Green Tea',
  'green-tea',
  'Leaf',
  12,
  productMock.stock,
);
export const missingProductMock = new Product('missing-product', 'Missing', 'missing', '', 0, 0);
