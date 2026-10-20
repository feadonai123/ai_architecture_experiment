import { AppError } from './AppError';
export class InvalidPaymentTokenError extends AppError {
  constructor() {
    super('Invalid payment token', 400);
  }
}
