import { Product } from '../../src/shared/entities/Product';

export const productMock = new Product('product-1', 'Tea', '', 10, 10);
export const updatedCatalogProductMock = new Product(
  productMock.id,
  'Green Tea',
  'Leaf',
  12,
  productMock.stock,
);
export const missingProductMock = new Product('missing-product', 'Missing', '', 0, 0);
