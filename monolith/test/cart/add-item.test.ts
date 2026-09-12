import {
  CartNotFoundError,
  InsufficientStockError,
  InvalidQuantityError,
  ProductNotFoundError,
} from '../../src/errors';
import { addCartItem } from '../../src/routes/addCartItem';
import {
  cartMock,
  exceedingQuantityMock,
  incrementQuantityMock,
  incrementedItemMock,
  invalidQuantityMock,
  itemMock,
  lowStockProductMock,
  missingCartMock,
  missingProductMock,
  productMock,
} from '../mocks/add-item';
import { mockCartRepo } from '../mocks/cart';
import { mockCartItemRepo } from '../mocks/cartItem';
import { mockDataSource } from '../mocks/dataSource';
import { mockProductRepo } from '../mocks/product';

describe('add item', () => {
  describe('success', () => {
    it('creates a new cart item', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: productMock }),
        cart: mockCartRepo({ findOne: cartMock }),
        cartItem: mockCartItemRepo({ findOne: null, find: [itemMock], save: itemMock }),
      });

      const result = await addCartItem(ds, {
        cartId: cartMock.id,
        productId: productMock.id,
        quantity: itemMock.quantity,
      });

      expect(result.items).toEqual([itemMock]);
    });

    it('increments existing item quantity', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: productMock }),
        cart: mockCartRepo({ findOne: cartMock }),
        cartItem: mockCartItemRepo({
          findOne: itemMock,
          find: [incrementedItemMock],
          save: incrementedItemMock,
        }),
      });

      const result = await addCartItem(ds, {
        cartId: cartMock.id,
        productId: productMock.id,
        quantity: incrementQuantityMock,
      });

      expect(result.items[0].quantity).toBe(incrementedItemMock.quantity);
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      const ds = mockDataSource({});
      await expect(
        addCartItem(ds, {
          cartId: cartMock.id,
          productId: productMock.id,
          quantity: invalidQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: null }),
      });
      await expect(
        addCartItem(ds, {
          cartId: cartMock.id,
          productId: missingProductMock.id,
          quantity: itemMock.quantity,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws CartNotFoundError', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: productMock }),
        cart: mockCartRepo({ findOne: null }),
      });
      await expect(
        addCartItem(ds, {
          cartId: missingCartMock.id,
          productId: productMock.id,
          quantity: itemMock.quantity,
        }),
      ).rejects.toBeInstanceOf(CartNotFoundError);
    });

    it('throws InsufficientStockError', async () => {
      const ds = mockDataSource({
        product: mockProductRepo({ findOne: lowStockProductMock }),
        cart: mockCartRepo({ findOne: cartMock }),
        cartItem: mockCartItemRepo({ findOne: null }),
      });
      await expect(
        addCartItem(ds, {
          cartId: cartMock.id,
          productId: productMock.id,
          quantity: exceedingQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
    });
  });
});
