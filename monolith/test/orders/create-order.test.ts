import {
  EmptyOrderItemsError,
  InsufficientStockError,
  InvalidQuantityError,
  ProductNotFoundError,
  UserNotFoundError,
} from '../../src/errors';
import { createOrder } from '../../src/routes/createOrder';
import { createOrderInputMock, productsMock, userMock } from '../mocks/create-order';
import { mockDataSource } from '../mocks/dataSource';
import { mockOrderItemRepo, mockOrderRepo } from '../mocks/order';
import { mockProductRepo } from '../mocks/product';
import { mockUserRepo } from '../mocks/user';

describe('create order', () => {
  describe('success', () => {
    it('creates a pending order with current prices and calculated total', async () => {
      const orderRepository = mockOrderRepo();
      const orderItemRepository = mockOrderItemRepo();
      const ds = mockDataSource({
        user: mockUserRepo({ findOne: userMock }),
        product: mockProductRepo({ find: productsMock }),
        order: orderRepository,
        orderItem: orderItemRepository,
      });

      const result = await createOrder(ds, createOrderInputMock);

      expect(result).toMatchObject({
        userId: userMock.id,
        status: 'PENDING',
        total: 250,
        items: [
          { productId: productsMock[0].id, quantity: 2, unitPrice: 100 },
          { productId: productsMock[1].id, quantity: 1, unitPrice: 50 },
        ],
      });
      expect(orderRepository.save).toHaveBeenCalledTimes(1);
      expect(orderItemRepository.save).toHaveBeenCalledTimes(1);
      expect(ds.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('errors', () => {
    it('throws EmptyOrderItemsError for an empty list', async () => {
      const ds = mockDataSource({});

      await expect(createOrder(ds, { userId: userMock.id, items: [] })).rejects.toBeInstanceOf(
        EmptyOrderItemsError,
      );
      expect(ds.transaction).not.toHaveBeenCalled();
    });

    it('throws InvalidQuantityError', async () => {
      const ds = mockDataSource({});

      await expect(
        createOrder(ds, {
          userId: userMock.id,
          items: [{ productId: productsMock[0].id, quantity: 0 }],
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
      expect(ds.transaction).not.toHaveBeenCalled();
    });

    it('throws UserNotFoundError', async () => {
      const ds = mockDataSource({
        user: mockUserRepo({ findOne: null }),
      });

      await expect(createOrder(ds, createOrderInputMock)).rejects.toBeInstanceOf(UserNotFoundError);
      expect(ds.transaction).not.toHaveBeenCalled();
    });

    it('throws ProductNotFoundError', async () => {
      const ds = mockDataSource({
        user: mockUserRepo({ findOne: userMock }),
        product: mockProductRepo({ find: [productsMock[0]] }),
      });

      await expect(createOrder(ds, createOrderInputMock)).rejects.toBeInstanceOf(
        ProductNotFoundError,
      );
      expect(ds.transaction).not.toHaveBeenCalled();
    });

    it('throws InsufficientStockError for aggregated duplicate quantities', async () => {
      const ds = mockDataSource({
        user: mockUserRepo({ findOne: userMock }),
        product: mockProductRepo({ find: [productsMock[0]] }),
      });

      await expect(
        createOrder(ds, {
          userId: userMock.id,
          items: [
            { productId: productsMock[0].id, quantity: 6 },
            { productId: productsMock[0].id, quantity: 5 },
          ],
        }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(ds.transaction).not.toHaveBeenCalled();
    });
  });
});
