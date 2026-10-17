import { ConfigConsumer } from '../../src/consumers/ConfigConsumer';
import { EventStream } from '../../src/events/EventStream';
import { EventType } from '../../src/events/EventType';

export function mockConsumerConfig(): ConfigConsumer {
  return {
    group: 'financial',
    streams: [EventStream.Orders],
    supportedEvents: [EventType.OrderCreated],
    batchSize: 10,
    readBlockMs: 5000,
    readErrorDelayMs: 1000,
    retryIntervalMs: 10000,
    retryReconcileIntervalMs: 60000,
    retryProcessingLeaseMs: 60000,
    retryReconcileBatchSize: 100,
    retryScheduleKey: 'financial:retry:schedule',
    retryEventKeyPrefix: 'financial:retry:event',
    retryMaxAttempts: 6,
    deadLetterStream: 'financial:dead-letter',
  } as ConfigConsumer;
}
