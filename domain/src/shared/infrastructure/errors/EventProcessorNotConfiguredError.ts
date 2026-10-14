export class EventProcessorNotConfiguredError extends Error {
  constructor(eventType: string) {
    super(`No event factory or handler registered for ${eventType}`);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
