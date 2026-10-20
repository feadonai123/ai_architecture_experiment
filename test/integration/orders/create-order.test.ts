import { ProductRecord } from '../../persistence/product.record';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../../helpers/api';
import { getTestDataSource, getTestRedis } from '../../helpers/setup';
import { OrderItemRecord } from '../../persistence/order-item.record';
import { OrderRecord } from '../../persistence/order.record';
import { ProductPrefab } from '../../prefabs/product.prefab';
import { UserPrefab } from '../../prefabs/user.prefab';

type ErrorBody = {
  error: string;
  message: string;
  statusCode: number;
};

function expectAppError(body: ErrorBody, error: string, message: string, statusCode: number): void {
  expect(body).toEqual({ error, message, statusCode });
}

function fieldsToRecord(fields: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < fields.length; index += 2) {
    result[fields[index]] = fields[index + 1];
  }
  return result;
}

describe('POST /orders', () => {
  beforeEach(async () => {
    await getTestRedis().del('orders');
  });

  describe('success', () => {
    it('creates the order and items and publishes OrderCreated', async () => {
      const dataSource = getTestDataSource();
      const user = await UserPrefab.create(dataSource);
      const product = await ProductPrefab.create(dataSource, { price: 10, stock: 10 });

      const response = await api()
        .post('/orders')
        .send({
          userId: user.id,
          items: [
            { productId: product.id, quantity: 1 },
            { productId: product.id, quantity: 2 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        userId: user.id,
        status: 0,
        total: 30,
        createdAt: expect.any(String),
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: 10,
          },
          {
            productId: product.id,
            quantity: 2,
            unitPrice: 10,
          },
        ],
      });

      expect(
        (await dataSource.getRepository(ProductRecord).findOneByOrFail({ id: product.id })).stock,
      ).toBe(7);
      const persistedOrder = await dataSource.getRepository(OrderRecord).findOneByOrFail({
        id: response.body.id,
      });
      expect(persistedOrder).toMatchObject({
        userId: user.id,
        status: 0,
        total: 30,
      });
      expect(
        await dataSource.getRepository(OrderItemRecord).find({
          where: { orderId: response.body.id },
          order: { quantity: 'ASC' },
        }),
      ).toMatchObject([
        { productId: product.id, quantity: 1, unitPrice: 10 },
        { productId: product.id, quantity: 2, unitPrice: 10 },
      ]);

      const entries = await getTestRedis().xrange('orders', '-', '+');
      expect(entries).toHaveLength(1);
      const event = fieldsToRecord(entries[0][1]);
      expect(event.event).toBe('OrderCreated');
      expect(event.eventId).toEqual(expect.any(String));
      expect(event.timestamp).toEqual(expect.any(String));
      expect(JSON.parse(event.payload)).toEqual({
        orderId: response.body.id,
        userId: user.id,
        items: [
          { productId: product.id, quantity: 1 },
          { productId: product.id, quantity: 2 },
        ],
      });
    });
  });

  describe('concurrency', () => {
    it('preserves an increment concurrent with order creation', async () => {
      const ds = getTestDataSource();
      const user = await UserPrefab.create(ds);
      const product = await ProductPrefab.create(ds, { stock: 10 });
      const responses = await Promise.all([
        api()
          .post('/orders')
          .send({ userId: user.id, items: [{ productId: product.id, quantity: 3 }] }),
        api().patch(`/stocks/${product.id}/increase`).send({ quantity: 3 }),
      ]);
      expect(responses.map((response) => response.status)).toEqual([201, 200]);
      expect(
        (await ds.getRepository(ProductRecord).findOneByOrFail({ id: product.id })).stock,
      ).toBe(10);
    });
    it('preserves the deducted stock during a concurrent catalog update', async () => {
      const ds = getTestDataSource();
      const user = await UserPrefab.create(ds);
      const product = await ProductPrefab.create(ds, { stock: 10 });
      const responses = await Promise.all([
        api()
          .post('/orders')
          .send({ userId: user.id, items: [{ productId: product.id, quantity: 3 }] }),
        api()
          .put(`/products/${product.id}`)
          .send({ name: 'Updated', slug: product.slug, description: '', price: 50 }),
      ]);
      expect(responses.map((response) => response.status)).toEqual([201, 200]);
      expect(
        await ds.getRepository(ProductRecord).findOneByOrFail({ id: product.id }),
      ).toMatchObject({ stock: 7, name: 'Updated', price: 50 });
    });
    it('accepts only one order competing for the last units', async () => {
      const ds = getTestDataSource();
      const user = await UserPrefab.create(ds);
      const product = await ProductPrefab.create(ds, { stock: 3 });
      const buy = () =>
        api()
          .post('/orders')
          .send({ userId: user.id, items: [{ productId: product.id, quantity: 3 }] });
      const responses = await Promise.all([buy(), buy()]);
      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
      expectAppError(
        responses.find((response) => response.status === 409)!.body,
        'InsufficientStockError',
        'Insufficient stock for the requested quantity',
        409,
      );
      expect(
        (await ds.getRepository(ProductRecord).findOneByOrFail({ id: product.id })).stock,
      ).toBe(0);
      expect(await ds.getRepository(OrderRecord).count()).toBe(1);
      expect(await getTestRedis().xlen('orders')).toBe(1);
    });
    it('locks multiple products in a stable order for reversed item lists', async () => {
      const ds = getTestDataSource();
      const user = await UserPrefab.create(ds);
      const a = await ProductPrefab.create(ds, { stock: 2 });
      const b = await ProductPrefab.create(ds, { stock: 2 });
      const buy = (ids: string[]) =>
        api()
          .post('/orders')
          .send({ userId: user.id, items: ids.map((productId) => ({ productId, quantity: 1 })) });
      const responses = await Promise.all([buy([a.id, b.id]), buy([b.id, a.id])]);
      expect(responses.map((response) => response.status)).toEqual([201, 201]);
      for (const id of [a.id, b.id])
        expect((await ds.getRepository(ProductRecord).findOneByOrFail({ id })).stock).toBe(0);
    });
  });

  describe('errors', () => {
    it('preserves all stocks when any item has insufficient stock', async () => {
      const ds = getTestDataSource();
      const user = await UserPrefab.create(ds);
      const a = await ProductPrefab.create(ds, { stock: 10 });
      const b = await ProductPrefab.create(ds, { stock: 1 });
      const response = await api()
        .post('/orders')
        .send({
          userId: user.id,
          items: [
            { productId: a.id, quantity: 3 },
            { productId: b.id, quantity: 2 },
          ],
        });
      expect(response.status).toBe(409);
      expectAppError(
        response.body,
        'InsufficientStockError',
        'Insufficient stock for the requested quantity',
        409,
      );
      expect((await ds.getRepository(ProductRecord).findOneByOrFail({ id: a.id })).stock).toBe(10);
      expect((await ds.getRepository(ProductRecord).findOneByOrFail({ id: b.id })).stock).toBe(1);
      expect(await ds.getRepository(OrderRecord).count()).toBe(0);
      expect(await ds.getRepository(OrderItemRecord).count()).toBe(0);
      expect(await getTestRedis().xlen('orders')).toBe(0);
    });

    it('returns EmptyOrderItemsError when items is empty', async () => {
      const response = await api().post('/orders').send({ userId: uuidv4(), items: [] });

      expect(response.status).toBe(400);
      expectAppError(
        response.body,
        'EmptyOrderItemsError',
        'Order items must be a non-empty array',
        400,
      );
    });

    it('returns EmptyOrderItemsError when items is not an array', async () => {
      const response = await api().post('/orders').send({ userId: uuidv4(), items: {} });

      expect(response.status).toBe(400);
      expectAppError(
        response.body,
        'EmptyOrderItemsError',
        'Order items must be a non-empty array',
        400,
      );
    });

    it('returns InvalidQuantityError when quantity is invalid', async () => {
      const response = await api()
        .post('/orders')
        .send({
          userId: uuidv4(),
          items: [{ productId: uuidv4(), quantity: 0 }],
        });

      expect(response.status).toBe(400);
      expectAppError(response.body, 'InvalidQuantityError', 'Invalid quantity: 0', 400);
    });

    it('returns UserNotFoundError when the user does not exist', async () => {
      const userId = uuidv4();
      const response = await api()
        .post('/orders')
        .send({
          userId,
          items: [{ productId: uuidv4(), quantity: 1 }],
        });

      expect(response.status).toBe(404);
      expectAppError(response.body, 'UserNotFoundError', `User not found: ${userId}`, 404);
    });

    it('returns ProductNotFoundError when the product does not exist', async () => {
      const user = await UserPrefab.create(getTestDataSource());
      const productId = uuidv4();
      const response = await api()
        .post('/orders')
        .send({
          userId: user.id,
          items: [{ productId, quantity: 1 }],
        });

      expect(response.status).toBe(404);
      expectAppError(response.body, 'ProductNotFoundError', `Product not found: ${productId}`, 404);
    });

    it('returns InsufficientStockError for the aggregate quantity', async () => {
      const dataSource = getTestDataSource();
      const user = await UserPrefab.create(dataSource);
      const product = await ProductPrefab.create(dataSource, { stock: 10 });
      const response = await api()
        .post('/orders')
        .send({
          userId: user.id,
          items: [
            { productId: product.id, quantity: 6 },
            { productId: product.id, quantity: 5 },
          ],
        });

      expect(response.status).toBe(409);
      expectAppError(
        response.body,
        'InsufficientStockError',
        'Insufficient stock for the requested quantity',
        409,
      );
      expect(await dataSource.getRepository(OrderRecord).count()).toBe(0);
      expect(await getTestRedis().xlen('orders')).toBe(0);
    });
  });
});
