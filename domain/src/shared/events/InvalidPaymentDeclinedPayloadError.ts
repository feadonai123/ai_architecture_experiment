import { InvalidPayloadError } from './InvalidPayloadError';
export class InvalidPaymentDeclinedPayloadError extends InvalidPayloadError {
  constructor() {
    super('Invalid PaymentDeclinedError payload');
  }
}
