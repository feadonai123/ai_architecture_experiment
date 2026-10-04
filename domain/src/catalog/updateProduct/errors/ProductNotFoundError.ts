import { AppError } from './AppError';

export class ProductNotFoundError extends AppError {
  constructor(productId: string) {
    super(`Product not found: ${productId}`, 404);
  }
}
