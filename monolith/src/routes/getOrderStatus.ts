import { DataSource } from 'typeorm';
import { Order } from '../entities/Order';
import { InvalidOrderIdError, OrderNotFoundError } from '../errors';
import { wrap } from '../helpers';
import { presentOrderStatus } from '../presenters/order.presenter';

export async function getOrderStatus(dataSource: DataSource, orderId: unknown): Promise<Order> {
  if (
    typeof orderId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
  )
    throw new InvalidOrderIdError(orderId);
  const order = await dataSource.getRepository(Order).findOne({ where: { id: orderId } });
  if (!order) throw new OrderNotFoundError(orderId);
  return order;
}

export function getOrderStatusRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const order = await getOrderStatus(dataSource, req.params.orderId);
    res.status(200).json(presentOrderStatus(order));
  });
}
