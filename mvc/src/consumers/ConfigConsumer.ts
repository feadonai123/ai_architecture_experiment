import { EventStream, EventStreamName } from '../events/EventStream';
import { EventType } from '../events/EventType';
import { requireEnv } from '../utils/env';

function positiveInteger(name: string): number {
  const value = Number(requireEnv(name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid positive integer environment variable: ${name}`);
  }
  return value;
}

export class ConfigConsumer {
  readonly group: string;
  readonly streams: EventStreamName[];
  readonly supportedEvents: EventType[];
  readonly batchSize: number;
  readonly readBlockMs: number;
  readonly readErrorDelayMs: number;
  readonly retryIntervalMs: number;
  readonly retryReconcileIntervalMs: number;
  readonly retryProcessingLeaseMs: number;
  readonly retryReconcileBatchSize: number;
  readonly retryScheduleKey: string;
  readonly retryEventKeyPrefix: string;
  readonly retryMaxAttempts: number;
  readonly deadLetterStream: string;

  constructor(prefix: string, handledEvents: readonly EventType[]) {
    this.group = requireEnv(`${prefix}_GROUP`);
    this.streams = requireEnv(`${prefix}_STREAMS`)
      .split(',')
      .map((value) => {
        const stream = value.trim();
        if (!EventStream.All.some((known) => known === stream)) {
          throw new Error(`Invalid ${prefix}_STREAMS value: ${stream}`);
        }
        return stream as EventStreamName;
      });
    this.supportedEvents = requireEnv(`${prefix}_SUPPORTED_EVENTS`)
      .split(',')
      .map((value) => {
        const event = value.trim();
        if (!handledEvents.includes(event as EventType)) {
          throw new Error(`Invalid ${prefix}_SUPPORTED_EVENTS value: ${event}`);
        }
        return event as EventType;
      });
    this.batchSize = positiveInteger(`${prefix}_BATCH_SIZE`);
    this.readBlockMs = positiveInteger(`${prefix}_READ_BLOCK_MS`);
    this.readErrorDelayMs = positiveInteger(`${prefix}_READ_ERROR_DELAY_MS`);
    this.retryIntervalMs = positiveInteger(`${prefix}_RETRY_INTERVAL_MS`);
    this.retryReconcileIntervalMs = positiveInteger(`${prefix}_RETRY_RECONCILE_INTERVAL_MS`);
    this.retryProcessingLeaseMs = positiveInteger(`${prefix}_RETRY_PROCESSING_LEASE_MS`);
    this.retryReconcileBatchSize = positiveInteger(`${prefix}_RETRY_RECONCILE_BATCH_SIZE`);
    this.retryScheduleKey = requireEnv(`${prefix}_RETRY_SCHEDULE_KEY`);
    this.retryEventKeyPrefix = requireEnv(`${prefix}_RETRY_EVENT_KEY_PREFIX`);
    this.retryMaxAttempts = positiveInteger(`${prefix}_RETRY_MAX_ATTEMPTS`);
    this.deadLetterStream = requireEnv(`${prefix}_DEAD_LETTER_STREAM`);
    if (this.streams.includes(this.deadLetterStream as EventStreamName)) {
      throw new Error(`${prefix}_DEAD_LETTER_STREAM must not be a watched stream`);
    }
  }
}
