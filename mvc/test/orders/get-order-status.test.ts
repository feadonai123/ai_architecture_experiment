import { OrderStatus } from '../../src/enums/OrderStatus';
import { orderId, orderMock } from '../mocks/get-order-status';
import { InvalidOrderIdError } from '../../src/errors/InvalidOrderIdError';
import { OrderNotFoundError } from '../../src/errors/OrderNotFoundError';
import { Request, Response } from 'express';
import { getStatus } from '../../src/controllers/order/routes/getStatus.route';
import { mockOrderFindById } from '../mocks/order';
function fixture(order: ReturnType<typeof orderMock> | null = orderMock()) {
  const find = mockOrderFindById(order);
  return {
    find,
    invoke: async (id: unknown) => {
      let failure: unknown;
      let body: unknown;
      let status = 0;
      const response = {
        status: (value: number) => {
          status = value;
          return response;
        },
        json: (value: unknown) => {
          body = value;
        },
      };
      await getStatus(
        { params: { orderId: id } } as unknown as Request,
        response as unknown as Response,
        (error) => {
          failure = error;
        },
      );
      if (failure) throw failure;
      expect(status).toBe(200);
      expect(body).toEqual({ orderId: order!.id, status: order!.status });
      return order;
    },
  };
}

describe('get order status', () => {
  afterEach(() => jest.restoreAllMocks());
  describe('success', () => {
    it.each([
      OrderStatus.PENDING,
      OrderStatus.PAYMENT_PENDING,
      OrderStatus.PAID,
      OrderStatus.CANCELED,
    ])('returns persisted status %s', async (status) => {
      const order = orderMock(status);
      const f = fixture(order);
      expect(await f.invoke(orderId)).toEqual(order);
      expect(f.find).toHaveBeenCalledWith(orderId);
    });
  });
  describe('errors', () => {
    it.each([undefined, null, 123, '', 'invalid', '00000000-0000-0000-0000-000000000000'])(
      'rejects invalid UUID %s before reading',
      async (id) => {
        const f = fixture();
        await expect(f.invoke(id)).rejects.toThrow(new InvalidOrderIdError(id));
        expect(f.find).not.toHaveBeenCalled();
      },
    );
    it('rejects an unknown order', async () => {
      const f = fixture(null);
      await expect(f.invoke(orderId)).rejects.toThrow(new OrderNotFoundError(orderId));
    });
  });
});
