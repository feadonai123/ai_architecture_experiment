import { AppError } from './AppError';
export class InsufficientStockError extends AppError {
  constructor() {
    super('Insufficient stock for the requested quantity', 409);
  }
}
