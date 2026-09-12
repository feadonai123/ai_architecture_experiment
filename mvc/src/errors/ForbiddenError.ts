import { AppError } from './AppError';

export class ForbiddenError extends AppError {
  constructor() {
    super('Forbidden', 403);
  }
}
