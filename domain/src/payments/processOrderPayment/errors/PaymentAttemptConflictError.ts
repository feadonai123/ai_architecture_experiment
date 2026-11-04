import { AppError } from './AppError';
export class PaymentAttemptConflictError extends AppError {
  constructor(orderId: string) {
    super(`Payment attempt conflict for order: ${orderId}`, 409);
  }
}
