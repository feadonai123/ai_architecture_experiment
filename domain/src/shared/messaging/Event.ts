import { EventStream } from './EventStream';
import { EventType } from './EventType';

export abstract class Event<TPayload> {
  private payload?: TPayload;

  protected constructor(
    private readonly id: string,
    private readonly type: EventType,
    private readonly stream: EventStream,
    private readonly rawPayload: unknown,
    private readonly timestamp: Date = new Date(),
  ) {}

  protected abstract convertPayload(value: unknown): TPayload;

  getId(): string {
    return this.id;
  }
  getType(): EventType {
    return this.type;
  }
  getStream(): EventStream {
    return this.stream;
  }
  getTimestamp(): Date {
    return this.timestamp;
  }
  getPayload(): TPayload {
    if (this.payload === undefined) this.payload = this.convertPayload(this.rawPayload);
    return this.payload;
  }
}
