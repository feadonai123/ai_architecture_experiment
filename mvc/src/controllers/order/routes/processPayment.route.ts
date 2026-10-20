import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from '../../../database';
import { Order } from '../../../models/Order';
import { OrderPayment } from '../../../models/OrderPayment';
import { OrderStatus } from '../../../enums/OrderStatus';
import { OrderPaymentStatus } from '../../../enums/OrderPaymentStatus';
import { PaymentToken } from '../../../enums/PaymentToken';
import { PaymentProvider } from '../../../enums/PaymentProvider';
import { PaymentApprovedEvent, PaymentApprovedPayload } from '../../../events/PaymentApprovedEvent';
import {
  PaymentDeclinedErrorEvent,
  PaymentDeclinedErrorPayload,
} from '../../../events/PaymentDeclinedErrorEvent';
import { InvalidOrderIdError } from '../../../errors/InvalidOrderIdError';
import { InvalidPaymentTokenError } from '../../../errors/InvalidPaymentTokenError';
import { PaymentNotReadyError } from '../../../errors/PaymentNotReadyError';
import { InvalidOrderPaymentStateError } from '../../../errors/InvalidOrderPaymentStateError';
import { PaymentDeclinedError } from '../../../errors/PaymentDeclinedError';
import { OrderNotFoundError } from '../../../errors/OrderNotFoundError';
import { presentOrderPayment } from '../../../presenters/orderPayment.presenter';
import { publish } from '../../../services/redis';
export async function processPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orderId = req.params.orderId;
    const token: unknown = req.body?.paymentToken;
    if (
      typeof orderId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
    )
      throw new InvalidOrderIdError(orderId);
    if (token !== PaymentToken.APPROVED && token !== PaymentToken.DECLINED)
      throw new InvalidPaymentTokenError();
    let event: PaymentApprovedEvent | PaymentDeclinedErrorEvent | undefined;
    const result = await getDataSource().transaction(async (manager) => {
      const order = await Order.findByIdForUpdate(orderId, manager);
      if (!order) throw new OrderNotFoundError(orderId);
      const payment = await OrderPayment.findByOrderId(orderId, manager);
      if (!payment) throw new PaymentNotReadyError(orderId);
      if (
        payment.status === OrderPaymentStatus.PAID &&
        (order.status === OrderStatus.PAYMENT_PENDING || order.status === OrderStatus.PAID)
      )
        return payment;
      if (
        payment.status === OrderPaymentStatus.DECLINED &&
        (order.status === OrderStatus.PAYMENT_PENDING || order.status === OrderStatus.CANCELED)
      )
        return payment;
      if (
        payment.status !== OrderPaymentStatus.PENDING ||
        order.status !== OrderStatus.PAYMENT_PENDING
      )
        throw new InvalidOrderPaymentStateError(orderId);
      const approved = token === PaymentToken.APPROVED;
      const transactionId = uuidv4();
      const paidAt = approved ? new Date() : null;
      payment.status = approved ? OrderPaymentStatus.PAID : OrderPaymentStatus.DECLINED;
      payment.paymentDetails = {
        provider: PaymentProvider.SIMULATED,
        transactionId,
        amount: order.total,
      };
      payment.paidAt = paidAt;
      await OrderPayment.update(payment, manager);
      const payload = { orderId, transactionId, amount: order.total };
      event = approved
        ? new PaymentApprovedEvent(
            uuidv4(),
            new PaymentApprovedPayload({ ...payload, paidAt: paidAt!.toISOString() }),
          )
        : new PaymentDeclinedErrorEvent(uuidv4(), new PaymentDeclinedErrorPayload(payload));
      return payment;
    });
    if (event) await publish(event);
    if (result.status === OrderPaymentStatus.DECLINED) {
      const error = new PaymentDeclinedError(result.orderId);
      res
        .status(error.statusCode)
        .json({ error: error.name, message: error.message, statusCode: error.statusCode });
    } else res.status(200).json(presentOrderPayment(result));
  } catch (error) {
    next(error);
  }
}
