export class RetryAttemptsExhaustedError extends Error {
  constructor(maxAttempts: number, lastError: string) {
    super(`Retry attempts exhausted after ${maxAttempts} attempts. Last error: ${lastError}`);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
