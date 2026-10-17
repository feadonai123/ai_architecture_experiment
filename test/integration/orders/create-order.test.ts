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

  describe('errors', () => {
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
