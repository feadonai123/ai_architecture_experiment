import { EventStream } from '../events/EventStream';

export interface RetryState {
  readonly eventId: string;
  readonly entryId: string;
  readonly stream: EventStream;
  readonly deliveryCount: number;
  readonly lastAttemptAt: number;
  readonly nextAttemptAt: number;
  readonly idleTimeMs: number;
  readonly lastError: string;
}
