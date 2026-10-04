import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource } from '../../helpers/setup';
import { CartPrefab } from '../../prefabs/cart.prefab';
import { CartItemPrefab } from '../../prefabs/cart-item.prefab';
import { ProductPrefab } from '../../prefabs/product.prefab';

describe('POST /cart/items', () => {
  describe('success', () => {
    it('creates a new cart item', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const product = await ProductPrefab.create(ds, { stock: 10, price: 100 });

      const response = await api().post('/cart/items').send({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(cart.id);
      expect(response.body.items).toEqual([
        {
          id: expect.any(String),
          productId: product.id,
          quantity: 2,
        },
      ]);
    });

    it('increments the quantity of an existing item', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const product = await ProductPrefab.create(ds, { stock: 10 });
      await CartItemPrefab.create(ds, {
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await api().post('/cart/items').send({
        cartId: cart.id,
        productId: product.id,
        quantity: 3,
      });

      expect(response.status).toBe(201);
      expect(response.body.items).toEqual([
        {
          id: expect.any(String),
          productId: product.id,
          quantity: 5,
        },
      ]);
    });
  });

  describe('errors', () => {
    it('returns InvalidQuantityError when quantity is 0', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const product = await ProductPrefab.create(ds);

      const response = await api().post('/cart/items').send({
        cartId: cart.id,
        productId: product.id,
        quantity: 0,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidQuantityError');
    });

    it('returns InvalidQuantityError when quantity is not an integer', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const product = await ProductPrefab.create(ds);

      const response = await api().post('/cart/items').send({
        cartId: cart.id,
        productId: product.id,
        quantity: 1.5,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidQuantityError');
    });

    it('returns ProductNotFoundError when the product does not exist', async () => {
      const cart = await CartPrefab.create(getTestDataSource());

      const response = await api().post('/cart/items').send({
        cartId: cart.id,
        productId: uuidv4(),
        quantity: 1,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
    });

    it('returns ProductNotFoundError when the product is deleted', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const product = await ProductPrefab.create(ds, { deletedAt: new Date() });

      const response = await api().post('/cart/items').send({
        cartId: cart.id,
        productId: product.id,
        quantity: 1,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ProductNotFoundError');
    });

    it('returns CartNotFoundError when the cart does not exist', async () => {
      const product = await ProductPrefab.create(getTestDataSource());

      const response = await api().post('/cart/items').send({
        cartId: uuidv4(),
        productId: product.id,
        quantity: 1,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('CartNotFoundError');
    });

    it('returns InsufficientStockError when requested quantity exceeds stock', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const product = await ProductPrefab.create(ds, { stock: 2 });

      const response = await api().post('/cart/items').send({
        cartId: cart.id,
        productId: product.id,
        quantity: 5,
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('InsufficientStockError');
    });

    it('returns InsufficientStockError when increment would exceed stock', async () => {
      const ds = getTestDataSource();
      const cart = await CartPrefab.create(ds);
      const product = await ProductPrefab.create(ds, { stock: 5 });
      await CartItemPrefab.create(ds, {
        cartId: cart.id,
        productId: product.id,
        quantity: 3,
      });

      const response = await api().post('/cart/items').send({
        cartId: cart.id,
        productId: product.id,
        quantity: 3,
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('InsufficientStockError');
    });
  });
});
