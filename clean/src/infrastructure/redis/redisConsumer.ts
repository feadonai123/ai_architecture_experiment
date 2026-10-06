import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Consumer } from '../../consumers/consumer';
import { ConsumerMessage } from '../../consumers/consumerMessage';
import { EventDispatcher } from '../../consumers/eventDispatcher';
import { IConsumerSettings } from '../../consumers/iConsumerSettings';
import { RetryState } from '../../consumers/retryState';
import { EventFactoryNotFoundError } from '../../errors/eventFactoryNotFoundError';
import { EventProcessorNotConfiguredError } from '../../errors/eventProcessorNotConfiguredError';
import { InvalidPayloadError } from '../../errors/InvalidPayloadError';
import { RedisConsumerNotInitializedError } from '../../errors/redisConsumerNotInitializedError';
import { RetryAttemptsExhaustedError } from '../../errors/RetryAttemptsExhaustedError';
import { RetryDelayOutOfRangeError } from '../../errors/retryDelayOutOfRangeError';
import { Event } from '../../events/Event';
import { EventStream } from '../../events/EventStream';
import { EventType } from '../../events/EventType';
import { IEventService } from '../../ports/IEventService';
import {
  acknowledge,
  acknowledgeAndRemoveHashAndSchedule,
  claimPendingEntry,
  createConsumerGroup,
  disconnect,
  duplicate,
  getHash,
  listPending,
  listSortedSetByScore,
  readConsumerGroup,
  removeHashAndSchedule,
  removeSortedSetMember,
  saveHashAndSchedule,
  setHash,
  StreamMessage,
} from '../../services/redis';
import {
  parseDate,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from '../../utils/parser';

export type EventFactory = (
  eventId: string,
  payload: string | undefined,
  timestamp?: Date,
) => Event<unknown>;

function messageFromRedis(stream: EventStream, [id, rawFields]: StreamMessage): ConsumerMessage {
  const fields: Record<string, string> = {};
  for (let index = 0; index < rawFields.length; index += 2) {
    fields[rawFields[index]] = rawFields[index + 1] ?? '';
  }
  return { id, stream, fields, rawFields };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export class RedisConsumer extends Consumer {
  private primaryRedis?: Redis;
  private retryRedis?: Redis;
  private primaryDone?: Promise<void>;
  private retryDone?: Promise<void>;
  private lastReconciliationAt = 0;
  private readonly cancelWaits = new Set<() => void>();

  constructor(
    eventService: IEventService,
    dispatcher: EventDispatcher,
    settings: IConsumerSettings,
    private readonly redis: Redis,
    private readonly factories: ReadonlyMap<EventType, EventFactory>,
    name: string,
  ) {
    super(eventService, dispatcher, settings, `${name}-${process.pid}-${uuidv4()}`);
  }

  private primary(): Redis {
    if (!this.primaryRedis) throw new RedisConsumerNotInitializedError('primary');
    return this.primaryRedis;
  }

  private retryClient(): Redis {
    if (!this.retryRedis) throw new RedisConsumerNotInitializedError('retry');
    return this.retryRedis;
  }


  // Analisar
  async initialize(): Promise<void> {
    if (this.primaryRedis || this.retryRedis) return;
    for (const type of this.settings.supportedEvents) {
      if (!this.factories.has(type) || !this.dispatcher.hasHandlers(type)) {
        throw new EventProcessorNotConfiguredError(type);
      }
    }
    const primary = duplicate(this.redis);
    const retry = duplicate(this.redis);
    try {
      await this.ensureGroups(primary);
      await this.ensureGroups(retry);
      this.primaryRedis = primary;
      this.retryRedis = retry;
      await this.reconcilePendingEvents(retry);
      this.lastReconciliationAt = Date.now();
    } catch (error) {
      disconnect(primary);
      disconnect(retry);
      this.primaryRedis = undefined;
      this.retryRedis = undefined;
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.running) return;
    await this.initialize();
    this.running = true;
    this.primaryDone = this.consume();
    this.retryDone = this.retryLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const cancel of this.cancelWaits) cancel();
    if (this.primaryRedis) disconnect(this.primaryRedis);
    if (this.retryRedis) disconnect(this.retryRedis);
    await Promise.allSettled([this.primaryDone, this.retryDone]);
    this.primaryRedis = undefined;
    this.retryRedis = undefined;
    this.primaryDone = undefined;
    this.retryDone = undefined;
    this.lastReconciliationAt = 0;
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.cancelWaits.delete(cancel);
        resolve();
      }, milliseconds);
      const cancel = () => {
        clearTimeout(timeout);
        this.cancelWaits.delete(cancel);
        resolve();
      };
      this.cancelWaits.add(cancel);
    });
  }

  private async ensureGroups(redis: Redis): Promise<void> {
    for (const stream of this.settings.streams) {
      try {
        await createConsumerGroup(stream, this.settings.group, redis);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('BUSYGROUP')) throw error;
      }
    }
  }

  protected async readMessages(): Promise<ConsumerMessage[]> {
    const redis = this.primary();
    await this.ensureGroups(redis);
    const response = await readConsumerGroup(
      this.settings.group,
      this.consumerName,
      this.settings.streams,
      this.settings.batchSize,
      this.settings.readBlockMs,
      redis,
    );
    return (response ?? []).flatMap(([stream, messages]) =>
      messages.map((message) => messageFromRedis(stream as EventStream, message)),
    );
  }

  protected deserialize(message: ConsumerMessage): Event<unknown> | null {
    const type = message.fields.event as EventType;
    if (!this.settings.supportedEvents.includes(type)) return null;
    const factory = this.factories.get(type);
    if (!factory) throw new EventFactoryNotFoundError(type);
    const timestamp = parseDate(message.fields.timestamp) ?? undefined;
    return factory(message.fields.eventId || message.id, message.fields.payload, timestamp);
  }

  protected async ack(message: ConsumerMessage): Promise<void> {
    await acknowledge(message.stream, this.settings.group, message.id, this.primary());
  }

  protected async ackUnsupported(message: ConsumerMessage): Promise<void> {
    await this.ack(message);
  }

  protected async handleAckFailure(
    _message: ConsumerMessage,
    _error: unknown,
  ): Promise<void> {
    return Promise.resolve();
  }

  protected async handleReadFailure(_error: unknown): Promise<void> {
    await this.wait(this.settings.readErrorDelayMs);
  }

  private member(message: ConsumerMessage): string {
    return `${message.stream}:${message.id}`;
  }

  private metadataKey(message: ConsumerMessage): string {
    return `${this.settings.retryEventKeyPrefix}:${this.member(message)}`;
  }

  private retryDelay(deliveryCount: number): number {
    const random = Math.floor(Math.random() * 30);
    const delay = ((deliveryCount - 1) ** 4 + 15 + random * deliveryCount) * 1000;
    const parsedDelay = parseNonNegativeSafeInteger(delay);
    if (parsedDelay === null) throw new RetryDelayOutOfRangeError(deliveryCount);
    return parsedDelay;
  }

  private parseState(values: Record<string, string>): RetryState | null {
    const deliveryCount = parsePositiveSafeInteger(values.deliveryCount);
    const lastAttemptAt = parseNonNegativeSafeInteger(values.lastAttemptAt);
    const nextAttemptAt = parseNonNegativeSafeInteger(values.nextAttemptAt);
    const idleTimeMs = parseNonNegativeSafeInteger(values.idleTimeMs);
    if (
      !values.eventId ||
      !values.entryId ||
      values.lastAttemptAt === undefined ||
      values.nextAttemptAt === undefined ||
      values.idleTimeMs === undefined ||
      values.lastError === undefined ||
      !this.settings.streams.includes(values.stream as EventStream) ||
      deliveryCount === null ||
      lastAttemptAt === null ||
      nextAttemptAt === null ||
      idleTimeMs === null
    )
      return null;
    return {
      eventId: values.eventId,
      entryId: values.entryId,
      stream: values.stream as EventStream,
      deliveryCount,
      lastAttemptAt,
      nextAttemptAt,
      idleTimeMs,
      lastError: values.lastError ?? '',
    };
  }

  private async publishDeadLetter(message: ConsumerMessage, error: Error): Promise<void> {
    await this.eventService.publishNow(this.settings.deadLetterStream, {
      sourceStream: message.stream,
      sourceEntryId: message.id,
      consumerGroup: this.settings.group,
      event: message.fields.event ?? '',
      eventId: message.fields.eventId || message.id,
      payload: message.fields.payload ?? '',
      originalFields: JSON.stringify(message.rawFields),
      errorName: error.name,
      errorMessage: error.message,
      failedAt: new Date().toISOString(),
    });
  }

  private async deadLetterThenConfirm(
    message: ConsumerMessage,
    error: Error,
    confirm: () => Promise<void>,
  ): Promise<void> {
    await this.publishDeadLetter(message, error);
    await confirm();
  }

  private async scheduleRetry(
    message: ConsumerMessage,
    deliveryCount: number,
    error: unknown,
    redis: Redis,
    lastAttemptAt: number = Date.now(),
  ): Promise<void> {
    const exhausted = deliveryCount >= this.settings.retryMaxAttempts;
    const idleTimeMs = exhausted ? 0 : this.retryDelay(deliveryCount);
    const nextAttemptAt = exhausted ? Date.now() : lastAttemptAt + idleTimeMs;
    await saveHashAndSchedule(
      this.metadataKey(message),
      {
        eventId: message.fields.eventId || message.id,
        entryId: message.id,
        stream: message.stream,
        deliveryCount,
        lastAttemptAt,
        nextAttemptAt,
        idleTimeMs,
        lastError: errorMessage(error),
      },
      this.settings.retryScheduleKey,
      nextAttemptAt,
      this.member(message),
      redis,
    );
  }

  protected async handleFailure(message: ConsumerMessage, error: unknown): Promise<void> {
    if (error instanceof InvalidPayloadError || this.settings.retryMaxAttempts === 1) {
      const reason =
        error instanceof InvalidPayloadError
          ? error
          : new RetryAttemptsExhaustedError(this.settings.retryMaxAttempts, errorMessage(error));
      try {
        await this.deadLetterThenConfirm(message, reason, () => this.ack(message));
      } catch {
        // A entrada permanece pendente para recuperação, sem log adicional.
      }
    } else {
      try {
        await this.scheduleRetry(message, 1, error, this.primary());
      } catch {
        // A entrada permanece na PEL para reconciliação, sem log adicional.
      }
    }
  }

  async reconcilePendingEvents(redis: Redis = this.retryClient()): Promise<void> {
    for (const stream of this.settings.streams) {
      let startId = '-';
      let hasMore = true;
      while (hasMore) {
        const pending = await listPending(
          stream,
          this.settings.group,
          startId,
          '+',
          this.settings.retryReconcileBatchSize,
          redis,
        );
        if (pending.length === 0) break;
        for (const [entryId, , idleTime, deliveryCount] of pending) {
          const message: ConsumerMessage = { id: entryId, stream, fields: {}, rawFields: [] };
          if (Object.keys(await getHash(this.metadataKey(message), redis)).length === 0) {
            await this.scheduleRetry(
              message,
              Math.max(1, deliveryCount),
              null,
              redis,
              Date.now() - idleTime,
            );
          }
        }
        hasMore = pending.length === this.settings.retryReconcileBatchSize;
        if (hasMore) startId = `(${pending[pending.length - 1][0]}`;
      }
    }
  }

  private async removeRetry(message: ConsumerMessage, redis: Redis): Promise<void> {
    await removeHashAndSchedule(
      this.metadataKey(message),
      this.settings.retryScheduleKey,
      this.member(message),
      redis,
    );
  }

  protected async confirmRetry(message: ConsumerMessage): Promise<void> {
    const redis = this.retryClient();
    await acknowledgeAndRemoveHashAndSchedule(
      message.stream,
      this.settings.group,
      message.id,
      this.metadataKey(message),
      this.settings.retryScheduleKey,
      this.member(message),
      redis,
    );
  }

  async retryPendingEvents(redis: Redis = this.retryClient()): Promise<void> {
    const due = await listSortedSetByScore(
      this.settings.retryScheduleKey,
      '-inf',
      Date.now(),
      0,
      this.settings.batchSize,
      redis,
    );
    for (const member of due) {
      try {
        await this.retryMember(member, redis);
      } catch {
        // O próximo ciclo pode recuperar a pendência, sem log operacional adicional.
      }
    }
  }

  private async retryMember(member: string, redis: Redis): Promise<void> {
    const separator = member.indexOf(':');
    if (separator < 1 || separator === member.length - 1) {
      await removeSortedSetMember(this.settings.retryScheduleKey, member, redis);
      return;
    }
    const stream = member.slice(0, separator) as EventStream;
    const entryId = member.slice(separator + 1);
    if (!this.settings.streams.includes(stream)) {
      await removeSortedSetMember(this.settings.retryScheduleKey, member, redis);
      return;
    }
    const reference: ConsumerMessage = { id: entryId, stream, fields: {}, rawFields: [] };
    const state = this.parseState(await getHash(this.metadataKey(reference), redis));
    if (!state || state.stream !== stream || state.entryId !== entryId) {
      await this.removeRetry(reference, redis);
      return;
    }

    const claimed = await claimPendingEntry(
      stream,
      this.settings.group,
      `${this.consumerName}-retry`,
      state.idleTimeMs,
      entryId,
      redis,
    );
    if (claimed.length === 0) {
      const pending = await listPending(stream, this.settings.group, entryId, entryId, 1, redis);
      if (pending.length === 0) await this.removeRetry(reference, redis);
      return;
    }
    await this.retryMessage(messageFromRedis(stream, claimed[0]), state, redis);
  }

  private async retryMessage(
    message: ConsumerMessage,
    state: RetryState,
    redis: Redis,
  ): Promise<void> {
    if (state.deliveryCount >= this.settings.retryMaxAttempts) {
      const nextAttemptAt = Date.now() + this.settings.retryProcessingLeaseMs;
      await saveHashAndSchedule(
        this.metadataKey(message),
        { nextAttemptAt },
        this.settings.retryScheduleKey,
        nextAttemptAt,
        this.member(message),
        redis,
      );
      try {
        await this.deadLetterThenConfirm(
          message,
          new RetryAttemptsExhaustedError(this.settings.retryMaxAttempts, state.lastError),
          () => this.confirmRetry(message),
        );
      } catch {
        // A lease mantém a entrada disponível para uma nova recuperação silenciosa.
      }
      return;
    }

    const deliveryCount = state.deliveryCount + 1;
    const lastAttemptAt = Date.now();
    const nextAttemptAt = lastAttemptAt + this.settings.retryProcessingLeaseMs;
    await saveHashAndSchedule(
      this.metadataKey(message),
      {
        eventId: message.fields.eventId || state.eventId,
        deliveryCount,
        lastAttemptAt,
        nextAttemptAt,
      },
      this.settings.retryScheduleKey,
      nextAttemptAt,
      this.member(message),
      redis,
    );
    await this.retry(message, deliveryCount);
  }

  protected async handleRetryFailure(
    message: ConsumerMessage,
    error: unknown,
    deliveryCount: number,
  ): Promise<void> {
    const redis = this.retryClient();
    if (error instanceof InvalidPayloadError || deliveryCount >= this.settings.retryMaxAttempts) {
      if (!(error instanceof InvalidPayloadError)) {
        await setHash(this.metadataKey(message), { lastError: errorMessage(error) }, redis);
      }
      const reason =
        error instanceof InvalidPayloadError
          ? error
          : new RetryAttemptsExhaustedError(this.settings.retryMaxAttempts, errorMessage(error));
      try {
        await this.deadLetterThenConfirm(message, reason, () => this.confirmRetry(message));
      } catch {
        // A entrada e seu estado de retry permanecem para recuperação, sem outro log.
      }
    } else {
      await this.scheduleRetry(message, deliveryCount, error, redis);
    }
  }

  private async retryLoop(): Promise<void> {
    const redis = this.retryClient();
    await this.ensureGroups(redis);
    while (this.running) {
      try {

        if (Date.now() - this.lastReconciliationAt >= this.settings.retryReconcileIntervalMs) {
          await this.reconcilePendingEvents(redis);
          this.lastReconciliationAt = Date.now();
        }
        await this.retryPendingEvents(redis);
      } catch {
        if (!this.running) break;
      }
      if (this.running) await this.wait(this.settings.retryIntervalMs);
    }
  }
}
