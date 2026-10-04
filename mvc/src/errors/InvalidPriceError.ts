import { AppError } from './AppError';

export class InvalidPriceError extends AppError {
  constructor(price: unknown) {
    super(`Invalid price: ${String(price)}`, 400);
  }
}
