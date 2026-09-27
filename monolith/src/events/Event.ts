export type RedisStreamFields = Record<string, string>;

export abstract class Event<TPayload> {
  private payload?: TPayload;
  private readonly timestamp: Date;

  protected constructor(
    private readonly id: string,
    private readonly type: string,
    private readonly stream: string,
    private readonly rawPayload: unknown,
    timestamp: Date = new Date(),
  ) {
    this.timestamp = timestamp;
  }

  abstract convertPayload(payload: unknown): TPayload;

  getId(): string {
    return this.id;
  }

  getType(): string {
    return this.type;
  }

  getStream(): string {
    return this.stream;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }

  getPayload(): TPayload {
    if (this.payload === undefined) {
      this.payload = this.convertPayload(this.rawPayload);
    }
    return this.payload;
  }

  toRedisStreamFields(): RedisStreamFields {
    return {
      event: this.type,
      eventId: this.id,
      timestamp: this.timestamp.toISOString(),
      payload: JSON.stringify(this.getPayload()),
    };
  }
}
