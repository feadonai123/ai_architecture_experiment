import { AppError } from './AppError';

export class InvalidNameError extends AppError {
  constructor(name: unknown) {
    super(`Invalid name: ${String(name)}`, 400);
  }
}
