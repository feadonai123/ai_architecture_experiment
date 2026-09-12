import { AppError } from './AppError';

export class CartItemNotFoundError extends AppError {
  constructor(productId: string) {
    super(`Cart item not found for product: ${productId}`, 404);
  }
}
