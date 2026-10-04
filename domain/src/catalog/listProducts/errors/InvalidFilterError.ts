import { AppError } from './AppError';

export class InvalidFilterError extends AppError {
  constructor(value: unknown) {
    super(`Invalid filter: ${String(value)}`, 400);
  }
}
