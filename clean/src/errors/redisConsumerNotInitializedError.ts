export class RedisConsumerNotInitializedError extends Error {
  constructor(connection: 'primary' | 'retry') {
    super(`RedisConsumer ${connection} connection is not initialized`);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
