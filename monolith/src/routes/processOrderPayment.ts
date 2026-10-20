import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { wrap } from '../helpers';
import { Order } from '../entities/Order';
import { OrderPayment } from '../entities/OrderPayment';
import { OrderStatus } from '../enums/OrderStatus';
import { OrderPaymentStatus } from '../enums/OrderPaymentStatus';
import { PaymentToken } from '../enums/PaymentToken';
import { PaymentProvider } from '../enums/PaymentProvider';
import { PaymentApprovedEvent, PaymentApprovedPayload } from '../events/PaymentApprovedEvent';
import {
  PaymentDeclinedErrorEvent,
  PaymentDeclinedErrorPayload,
} from '../events/PaymentDeclinedErrorEvent';
import {
  InvalidOrderIdError,
  InvalidPaymentTokenError,
  PaymentNotReadyError,
  InvalidOrderPaymentStateError,
  PaymentDeclinedError,
  OrderNotFoundError,
} from '../errors';
import { presentOrderPayment } from '../presenters/orderPayment.presenter';
import { publish } from '../services/redis';
export async function processOrderPayment(
  dataSource: DataSource,
  redis: Redis,
  orderId: unknown,
  token: unknown,
): Promise<OrderPayment> {
  if (
    typeof orderId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
  )
    throw new InvalidOrderIdError(orderId);
  if (token !== PaymentToken.APPROVED && token !== PaymentToken.DECLINED)
    throw new InvalidPaymentTokenError();
  let event: PaymentApprovedEvent | PaymentDeclinedErrorEvent | undefined;
  const result = await dataSource.transaction(async (manager) => {
    const orders = manager.getRepository(Order);
    const payments = manager.getRepository(OrderPayment);
    const order = await orders.findOne({
      where: { id: orderId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) throw new OrderNotFoundError(orderId);
    const payment = await payments.findOne({ where: { orderId } });
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
    await payments.save(payment);
    const payload = { orderId, transactionId, amount: order.total };
    event = approved
      ? new PaymentApprovedEvent(
          uuidv4(),
          new PaymentApprovedPayload({ ...payload, paidAt: paidAt!.toISOString() }),
        )
      : new PaymentDeclinedErrorEvent(uuidv4(), new PaymentDeclinedErrorPayload(payload));
    return payment;
  });
  if (event) await publish(redis, event);
  return result;
}
export function processOrderPaymentRoute(dataSource: DataSource, redis: Redis) {
  return wrap(async (req, res) => {
    const payment = await processOrderPayment(
      dataSource,
      redis,
      req.params.orderId,
      req.body?.paymentToken,
    );
    if (payment.status === OrderPaymentStatus.DECLINED) {
      const error = new PaymentDeclinedError(payment.orderId);
      res
        .status(error.statusCode)
        .json({ error: error.name, message: error.message, statusCode: error.statusCode });
    } else res.status(200).json(presentOrderPayment(payment));
  });
}
