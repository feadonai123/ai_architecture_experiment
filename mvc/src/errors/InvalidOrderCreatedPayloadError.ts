import { InvalidPayloadError } from './InvalidPayloadError';

export class InvalidOrderCreatedPayloadError extends InvalidPayloadError {
  constructor() {
    super('Invalid OrderCreated payload');
  }
}
