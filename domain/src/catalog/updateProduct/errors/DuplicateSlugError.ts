import { AppError } from './AppError';

export class DuplicateSlugError extends AppError {
  constructor(slug: string) {
    super(`Duplicate slug: ${slug}`, 409);
  }
}
