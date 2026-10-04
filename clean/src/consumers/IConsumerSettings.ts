import { EventStream } from '../events/EventStream';
import { EventType } from '../events/EventType';

export interface IConsumerSettings {
  readonly group: string;
  readonly streams: readonly EventStream[];
  readonly supportedEvents: readonly EventType[];
  readonly batchSize: number;
  readonly readBlockMs: number;
  readonly readErrorDelayMs: number;
  readonly retryIntervalMs: number;
  readonly retryReconcileIntervalMs: number;
  readonly retryReconcileBatchSize: number;
  readonly retryProcessingLeaseMs: number;
  readonly retryScheduleKey: string;
  readonly retryEventKeyPrefix: string;
  readonly retryMaxAttempts: number;
  readonly deadLetterStream: string;
}
