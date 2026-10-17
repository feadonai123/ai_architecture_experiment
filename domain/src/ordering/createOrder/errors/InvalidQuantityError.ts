import { AppError } from './AppError';

export class InvalidQuantityError extends AppError {
  constructor(quantity: unknown) {
    super(`Invalid quantity: ${String(quantity)}`, 400);
  }
}
