import { EventStream } from '../events/EventStream';
import { EventType } from '../events/EventType';
import { requireEnv } from '../utils/env';
import { IConsumerSettings } from './IConsumerSettings';

function positiveInteger(name: string): number {
  const value = Number(requireEnv(name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid positive integer environment variable: ${name}`);
  }
  return value;
}

function values<T extends string>(name: string, allowed: readonly T[]): T[] {
  const entries = requireEnv(name)
    .split(',')
    .map((value) => value.trim());
  if (entries.some((value) => !value || !allowed.includes(value as T))) {
    throw new Error(`Invalid ${name} value`);
  }
  return [...new Set(entries)] as T[];
}

export class ConsumerSettings implements IConsumerSettings {
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

  constructor(prefix: string) {
    this.group = requireEnv(`${prefix}_GROUP`);
    this.streams = values(`${prefix}_STREAMS`, Object.values(EventStream));
    this.supportedEvents = values(`${prefix}_SUPPORTED_EVENTS`, Object.values(EventType));
    this.batchSize = positiveInteger(`${prefix}_BATCH_SIZE`);
    this.readBlockMs = positiveInteger(`${prefix}_READ_BLOCK_MS`);
    this.readErrorDelayMs = positiveInteger(`${prefix}_READ_ERROR_DELAY_MS`);
    this.retryIntervalMs = positiveInteger(`${prefix}_RETRY_INTERVAL_MS`);
    this.retryReconcileIntervalMs = positiveInteger(`${prefix}_RETRY_RECONCILE_INTERVAL_MS`);
    this.retryReconcileBatchSize = positiveInteger(`${prefix}_RETRY_RECONCILE_BATCH_SIZE`);
    this.retryProcessingLeaseMs = positiveInteger(`${prefix}_RETRY_PROCESSING_LEASE_MS`);
    this.retryScheduleKey = requireEnv(`${prefix}_RETRY_SCHEDULE_KEY`);
    this.retryEventKeyPrefix = requireEnv(`${prefix}_RETRY_EVENT_KEY_PREFIX`);
    this.retryMaxAttempts = positiveInteger(`${prefix}_RETRY_MAX_ATTEMPTS`);
    this.deadLetterStream = requireEnv(`${prefix}_DEAD_LETTER_STREAM`);
    if (this.streams.length === 0 || this.supportedEvents.length === 0) {
      throw new Error(`${prefix} must watch at least one stream and support at least one event`);
    }
    if (this.streams.includes(this.deadLetterStream as EventStream)) {
      throw new Error(`${prefix}_DEAD_LETTER_STREAM must not be a watched stream`);
    }
  }
}
