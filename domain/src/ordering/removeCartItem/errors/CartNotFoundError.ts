import { AppError } from './AppError';

export class CartNotFoundError extends AppError {
  constructor(cartId: string) {
    super(`Cart not found: ${cartId}`, 404);
  }
}
