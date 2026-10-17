import { AppError } from './AppError';
export class OrderNotFoundError extends AppError {
  constructor(orderId: string) {
    super(`Order not found: ${orderId}`, 404);
  }
}
