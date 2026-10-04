import { Product } from '../../src/entities/Product';

export const productMock = new Product('product-1', 'Tea', '', 10, 10);
export const missingProductMock = new Product('missing-product', 'Missing', '', 0, 0);
