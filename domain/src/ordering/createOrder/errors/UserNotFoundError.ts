import { AppError } from './AppError';

export class UserNotFoundError extends AppError {
  constructor(userId: string) {
    super(`User not found: ${userId}`, 404);
  }
}
