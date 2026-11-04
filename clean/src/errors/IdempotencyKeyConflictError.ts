import { AppError } from './AppError';
export class IdempotencyKeyConflictError extends AppError {
  constructor(idempotencyKey: string) {
    super(`Idempotency key already used with a different request: ${idempotencyKey}`, 409);
  }
}
