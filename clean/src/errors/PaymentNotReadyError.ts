import { AppError } from './AppError';
export class PaymentNotReadyError extends AppError {
  constructor(orderId: string) {
    super(`Payment not ready for order: ${orderId}`, 409);
  }
}
