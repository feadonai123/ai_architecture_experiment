export class EventFactoryNotFoundError extends Error {
  constructor(eventType: string) {
    super(`No event factory registered for ${eventType}`);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
