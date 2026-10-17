import { AppError } from './AppError';
export class EmptyOrderItemsError extends AppError {
  constructor() {
    super('Order items must be a non-empty array', 400);
  }
}
