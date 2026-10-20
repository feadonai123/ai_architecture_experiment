import { AppError } from './AppError';
export class PaymentDeclinedError extends AppError {
  constructor(orderId: string) {
    super(`Payment declined for order: ${orderId}`, 422);
  }
}
