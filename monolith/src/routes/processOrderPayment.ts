import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { wrap } from '../helpers';
import { Order } from '../entities/Order';
import { OrderPayment } from '../entities/OrderPayment';
import { OrderPaymentAttempt } from '../entities/OrderPaymentAttempt';
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
  InvalidIdempotencyKeyError,
  PaymentNotReadyError,
  InvalidOrderPaymentStateError,
  PaymentAttemptConflictError,
  PaymentDeclinedError,
  PaymentDeclinedRetryableError,
  OrderNotFoundError,
} from '../errors';
import { presentOrderPayment } from '../presenters/orderPayment.presenter';
import { publish } from '../services/redis';

const MAX_PAYMENT_ATTEMPTS = 2;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProcessOrderPaymentResult = {
  orderId: string;
  status: OrderPaymentStatus;
  paymentDetails: Record<string, unknown> | null;
  paidAt: Date | null;
  createdAt: Date;
};

export async function processOrderPayment(
  dataSource: DataSource,
  redis: Redis,
  orderId: unknown,
  token: unknown,
  idempotencyKey: unknown,
): Promise<ProcessOrderPaymentResult> {
  if (typeof orderId !== 'string' || !UUID_PATTERN.test(orderId)) {
    throw new InvalidOrderIdError(orderId);
  }
  if (token !== PaymentToken.APPROVED && token !== PaymentToken.DECLINED) {
    throw new InvalidPaymentTokenError();
  }
  if (typeof idempotencyKey !== 'string' || !UUID_PATTERN.test(idempotencyKey)) {
    throw new InvalidIdempotencyKeyError();
  }

  let event: PaymentApprovedEvent | PaymentDeclinedErrorEvent | undefined;
  const result = await dataSource.transaction(async (manager) => {
    const orders = manager.getRepository(Order);
    const payments = manager.getRepository(OrderPayment);
    const attempts = manager.getRepository(OrderPaymentAttempt);

    const order = await orders.findOne({
      where: { id: orderId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) throw new OrderNotFoundError(orderId);

    const payment = await payments.findOne({ where: { orderId } });
    if (!payment) throw new PaymentNotReadyError(orderId);

    const existingAttempt = await attempts.findOne({
      where: { orderId, idempotencyKey },
    });
    if (existingAttempt) {
      if (existingAttempt.token !== token) throw new PaymentAttemptConflictError(orderId);
      const existingApproved = existingAttempt.status === OrderPaymentStatus.PAID;
      const existingIsFinal =
        existingApproved || existingAttempt.attemptNumber >= MAX_PAYMENT_ATTEMPTS;
      return {
        orderId,
        status: existingApproved
          ? OrderPaymentStatus.PAID
          : existingIsFinal
            ? OrderPaymentStatus.DECLINED
            : OrderPaymentStatus.DECLINED_RETRY,
        paymentDetails: existingAttempt.paymentDetails,
        paidAt: existingAttempt.paidAt,
        createdAt: payment.createdAt,
      };
    }

    let attemptNumber: number;
    if (payment.status === OrderPaymentStatus.PENDING) {
      if (order.status !== OrderStatus.PAYMENT_PENDING)
        throw new InvalidOrderPaymentStateError(orderId);
      attemptNumber = 1;
    } else if (payment.status === OrderPaymentStatus.DECLINED_RETRY) {
      if (order.status !== OrderStatus.PAYMENT_PENDING)
        throw new InvalidOrderPaymentStateError(orderId);
      attemptNumber = 2;
    } else {
      throw new InvalidOrderPaymentStateError(orderId);
    }

    const approved = token === PaymentToken.APPROVED;
    const transactionId = uuidv4();
    const paidAt = approved ? new Date() : null;
    const paymentDetails = {
      provider: PaymentProvider.SIMULATED,
      transactionId,
      amount: order.total,
    };
    const attemptStatus = approved ? OrderPaymentStatus.PAID : OrderPaymentStatus.DECLINED;

    const attempt = attempts.create({
      orderId,
      idempotencyKey,
      attemptNumber,
      token,
      status: attemptStatus,
      paymentDetails,
      paidAt,
      createdAt: new Date(),
    });
    await attempts.save(attempt);

    const isFinal = approved || attemptNumber >= MAX_PAYMENT_ATTEMPTS;
    payment.status = approved
      ? OrderPaymentStatus.PAID
      : isFinal
        ? OrderPaymentStatus.DECLINED
        : OrderPaymentStatus.DECLINED_RETRY;
    payment.paymentDetails = paymentDetails;
    payment.paidAt = paidAt;
    await payments.save(payment);

    const payload = { orderId, transactionId, amount: order.total };
    if (isFinal) {
      event = approved
        ? new PaymentApprovedEvent(
            uuidv4(),
            new PaymentApprovedPayload({ ...payload, paidAt: paidAt!.toISOString() }),
          )
        : new PaymentDeclinedErrorEvent(uuidv4(), new PaymentDeclinedErrorPayload(payload));
    }

    return {
      orderId,
      status: payment.status,
      paymentDetails: payment.paymentDetails,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  });
  if (event) await publish(redis, event);
  return result;
}

export function processOrderPaymentRoute(dataSource: DataSource, redis: Redis) {
  return wrap(async (req, res) => {
    const result = await processOrderPayment(
      dataSource,
      redis,
      req.params.orderId,
      req.body?.paymentToken,
      req.header('Idempotency-Key'),
    );
    if (result.status === OrderPaymentStatus.PAID) {
      res.status(200).json(presentOrderPayment(result));
    } else {
      const error =
        result.status === OrderPaymentStatus.DECLINED_RETRY
          ? new PaymentDeclinedRetryableError(result.orderId)
          : new PaymentDeclinedError(result.orderId);
      res
        .status(error.statusCode)
        .json({ error: error.name, message: error.message, statusCode: error.statusCode });
    }
  });
}
