export class RedisEventPublicationError extends Error {
  constructor(stream: string) {
    super(`Failed to publish event to Redis Stream: ${stream}`);
    this.name = 'RedisEventPublicationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
