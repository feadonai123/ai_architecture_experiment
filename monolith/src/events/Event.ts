export type RedisStreamFields = Record<string, string>;

export abstract class Event<TPayload> {
  private readonly timestamp: Date;

  protected constructor(
    private readonly id: string,
    private readonly type: string,
    private readonly stream: string,
    private readonly payload: TPayload,
    timestamp: Date = new Date(),
  ) {
    this.timestamp = timestamp;
  }

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
    return this.payload;
  }

  toRedisStreamFields(): RedisStreamFields {
    return {
      event: this.type,
      eventId: this.id,
      timestamp: this.timestamp.toISOString(),
      payload: JSON.stringify(this.payload),
    };
  }
}
