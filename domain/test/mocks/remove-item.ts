import { Cart } from '../../src/shared/entities/Cart';
import { CartItem } from '../../src/shared/entities/CartItem';
import { Product } from '../../src/shared/entities/Product';

export const productMock = new Product('product-1', 'Tea', 'tea', '', 10, 10);
export const cartMock = new Cart('cart-1', new Date('2026-01-01T00:00:00.000Z'), []);
export const itemMock = new CartItem('item-1', cartMock.id, productMock.id, 1);
export const emptyCartMock = new Cart(cartMock.id, cartMock.createdAt, []);
export const missingCartMock = new Cart('missing-cart', cartMock.createdAt, []);
export const missingProductMock = new Product('missing-product', 'Missing', 'missing', '', 0, 0);
