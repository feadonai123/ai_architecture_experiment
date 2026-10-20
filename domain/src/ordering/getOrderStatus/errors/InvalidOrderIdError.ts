import { AppError } from './AppError';
export class InvalidOrderIdError extends AppError {
  constructor(orderId: unknown) {
    super(`Invalid order id: ${orderId}`, 400);
  }
}
