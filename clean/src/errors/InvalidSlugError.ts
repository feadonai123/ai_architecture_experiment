import { AppError } from './AppError';

export class InvalidSlugError extends AppError {
  constructor(slug: unknown) {
    super(`Invalid slug: ${String(slug)}`, 400);
  }
}
