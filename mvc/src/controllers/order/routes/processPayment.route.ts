import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from '../../../database';
import { Order } from '../../../models/Order';
import { OrderPayment } from '../../../models/OrderPayment';
import { OrderPaymentAttempt } from '../../../models/OrderPaymentAttempt';
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
import { InvalidIdempotencyKeyError } from '../../../errors/InvalidIdempotencyKeyError';
import { InvalidPaymentTokenError } from '../../../errors/InvalidPaymentTokenError';
import { PaymentNotReadyError } from '../../../errors/PaymentNotReadyError';
import { PaymentAttemptConflictError } from '../../../errors/PaymentAttemptConflictError';
import { InvalidOrderPaymentStateError } from '../../../errors/InvalidOrderPaymentStateError';
import { PaymentDeclinedError } from '../../../errors/PaymentDeclinedError';
import { OrderNotFoundError } from '../../../errors/OrderNotFoundError';
import { presentOrderPayment } from '../../../presenters/orderPayment.presenter';
import { publish } from '../../../services/redis';

const MAX_PAYMENT_ATTEMPTS = 2;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

type ProcessPaymentResult = {
  status: OrderPaymentStatus;
  paymentDetails: Record<string, unknown>;
  paidAt: Date | null;
  createdAt: Date;
};

export async function processPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orderId = req.params.orderId;
    const token: unknown = req.body?.paymentToken;
    const idempotencyKey = req.header('Idempotency-Key');
    if (!isUuid(orderId)) throw new InvalidOrderIdError(orderId);
    if (!isUuid(idempotencyKey)) throw new InvalidIdempotencyKeyError();
    if (token !== PaymentToken.APPROVED && token !== PaymentToken.DECLINED)
      throw new InvalidPaymentTokenError();

    let event: PaymentApprovedEvent | PaymentDeclinedErrorEvent | undefined;
    const result: ProcessPaymentResult = await getDataSource().transaction(async (manager) => {
      const order = await Order.findByIdForUpdate(orderId, manager);
      if (!order) throw new OrderNotFoundError(orderId);
      const payment = await OrderPayment.findByOrderId(orderId, manager);
      if (!payment) throw new PaymentNotReadyError(orderId);

      const existingAttempt = await OrderPaymentAttempt.findByOrderAndKey(
        orderId,
        idempotencyKey,
        manager,
      );
      if (existingAttempt) {
        if (existingAttempt.paymentToken !== token) throw new PaymentAttemptConflictError(orderId);
        return {
          status: existingAttempt.status,
          paymentDetails: existingAttempt.paymentDetails,
          paidAt: existingAttempt.paidAt,
          createdAt: payment.createdAt,
        };
      }

      if (
        payment.status !== OrderPaymentStatus.PENDING ||
        payment.attempts >= MAX_PAYMENT_ATTEMPTS ||
        order.status !== OrderStatus.PAYMENT_PENDING
      )
        throw new InvalidOrderPaymentStateError(orderId);

      const approved = token === PaymentToken.APPROVED;
      const transactionId = uuidv4();
      const paidAt = approved ? new Date() : null;
      const paymentDetails = {
        provider: PaymentProvider.SIMULATED,
        transactionId,
        amount: order.total,
      };
      const attemptNumber = payment.attempts + 1;
      const attemptStatus = approved ? OrderPaymentStatus.PAID : OrderPaymentStatus.DECLINED;
      const isFinalAttempt = approved || attemptNumber >= MAX_PAYMENT_ATTEMPTS;

      await OrderPaymentAttempt.create(
        {
          id: uuidv4(),
          orderId,
          attemptNumber,
          idempotencyKey,
          paymentToken: token,
          status: attemptStatus,
          paymentDetails,
          paidAt,
          createdAt: new Date(),
        },
        manager,
      );

      payment.attempts = attemptNumber;
      if (approved) {
        payment.status = OrderPaymentStatus.PAID;
        payment.paymentDetails = paymentDetails;
        payment.paidAt = paidAt;
      } else if (isFinalAttempt) {
        payment.status = OrderPaymentStatus.DECLINED;
        payment.paymentDetails = paymentDetails;
        payment.paidAt = null;
      }
      await OrderPayment.update(payment, manager);

      if (isFinalAttempt) {
        const payload = { orderId, transactionId, amount: order.total };
        event = approved
          ? new PaymentApprovedEvent(
              uuidv4(),
              new PaymentApprovedPayload({ ...payload, paidAt: paidAt!.toISOString() }),
            )
          : new PaymentDeclinedErrorEvent(uuidv4(), new PaymentDeclinedErrorPayload(payload));
      }

      return {
        status: attemptStatus,
        paymentDetails,
        paidAt,
        createdAt: payment.createdAt,
      };
    });
    if (event) await publish(event);
    if (result.status === OrderPaymentStatus.DECLINED) {
      const error = new PaymentDeclinedError(orderId);
      res
        .status(error.statusCode)
        .json({ error: error.name, message: error.message, statusCode: error.statusCode });
    } else res.status(200).json(presentOrderPayment({ orderId, ...result }));
  } catch (error) {
    next(error);
  }
}
