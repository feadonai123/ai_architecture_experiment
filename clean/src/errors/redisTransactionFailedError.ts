export class RedisTransactionFailedError extends Error {
  constructor(operation: string) {
    super(`Redis transaction failed: ${operation}`);
    this.name = 'RedisTransactionFailedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
