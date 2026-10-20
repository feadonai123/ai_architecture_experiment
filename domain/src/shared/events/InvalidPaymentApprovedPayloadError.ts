import { InvalidPayloadError } from './InvalidPayloadError';
export class InvalidPaymentApprovedPayloadError extends InvalidPayloadError {
  constructor() {
    super('Invalid PaymentApproved payload');
  }
}
