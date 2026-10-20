import { AppError } from './AppError';
export class InvalidOrderPaymentStateError extends AppError {
  constructor(orderId: string) {
    super(`Invalid payment state for order: ${orderId}`, 409);
  }
}
