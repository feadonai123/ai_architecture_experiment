import { Request, Response, NextFunction } from 'express';
import { Order } from '../../../models/Order';
import { InvalidOrderIdError } from '../../../errors/InvalidOrderIdError';
import { OrderNotFoundError } from '../../../errors/OrderNotFoundError';
import { presentOrderStatus } from '../../../presenters/order.presenter';

export async function getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = req.params.orderId;
    if (
      typeof orderId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
    )
      throw new InvalidOrderIdError(orderId);
    const order = await Order.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    res.status(200).json(presentOrderStatus(order));
  } catch (error) {
    next(error);
  }
}
