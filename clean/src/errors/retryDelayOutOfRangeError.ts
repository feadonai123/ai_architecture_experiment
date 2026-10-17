export class RetryDelayOutOfRangeError extends Error {
  constructor(deliveryCount: number) {
    super(`Retry delay exceeds safe integer range: ${deliveryCount}`);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
