import { AppError } from './AppError';
export class InvalidIdempotencyKeyError extends AppError {
  constructor() {
    super('Invalid idempotency key', 400);
  }
}
