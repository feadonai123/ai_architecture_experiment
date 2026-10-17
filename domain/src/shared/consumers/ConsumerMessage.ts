import { EventStream } from '../events/EventStream';

export interface ConsumerMessage {
  readonly id: string;
  readonly stream: EventStream;
  readonly fields: Readonly<Record<string, string>>;
  readonly rawFields: readonly string[];
}
