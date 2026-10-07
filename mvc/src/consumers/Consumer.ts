import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { InvalidPayloadError } from '../errors/InvalidPayloadError';
import { RetryAttemptsExhaustedError } from '../errors/RetryAttemptsExhaustedError';
import { EventStreamName } from '../events/EventStream';
import { EventType } from '../events/EventType';
import {
  acknowledge,
  acknowledgeAndRemoveHashAndSchedule,
  addStreamEntry,
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
} from '../services/redis';
import { Logger } from '../utils/Logger';
import { ConfigConsumer } from './ConfigConsumer';

type RetryState = {
  eventId: string;
  entryId: string;
  stream: EventStreamName;
  deliveryCount: number;
  lastAttemptAt: number;
  nextAttemptAt: number;
  idleTimeMs: number;
  lastError: string;
};

function fieldRecord(fields: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < fields.length; index += 2) {
    result[fields[index]] = fields[index + 1];
  }
  return result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export abstract class Consumer {
  private readonly primaryRedis: Redis;
  private readonly retryRedis: Redis;
  private readonly name: string;
  private readonly consumerName: string;
  private running = false;
  private primaryDone?: Promise<void>;
  private retryDone?: Promise<void>;
  private lastReconciliationAt = 0;
  private cancelRetryWait?: () => void;

  protected constructor(
    protected readonly config: ConfigConsumer,
    redis: Redis,
    name: string,
  ) {
    this.primaryRedis = duplicate(redis);
    this.retryRedis = duplicate(redis);
    this.name = name;
    this.consumerName = `${name}-${process.pid}-${uuidv4()}`;
  }

  protected abstract processEvent(
    type: EventType,
    eventId: string,
    payload: string | undefined,
  ): Promise<void>;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.primaryDone = this.consumeLoop();
    this.retryDone = this.retryLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.cancelRetryWait?.();
    disconnect(this.primaryRedis);
    disconnect(this.retryRedis);
    await Promise.all([this.primaryDone, this.retryDone]);
  }

  private member(stream: EventStreamName, entryId: string): string {
    return `${stream}:${entryId}`;
  }

  private metadataKey(stream: EventStreamName, entryId: string): string {
    return `${this.config.retryEventKeyPrefix}:${stream}:${entryId}`;
  }

  private retryDelay(deliveryCount: number): number {
    const random = Math.floor(Math.random() * 30);
    const delay = ((deliveryCount - 1) ** 4 + 15 + random * deliveryCount) * 1000;
    if (!Number.isSafeInteger(delay)) {
      throw new Error(`Retry delay exceeds the safe integer range: ${deliveryCount}`);
    }
    return delay;
  }

  private parseState(values: Record<string, string>): RetryState | null {
    if (
      !values.eventId ||
      !values.entryId ||
      !this.config.streams.includes(values.stream as EventStreamName)
    ) {
      return null;
    }
    const deliveryCount = Number(values.deliveryCount);
    const lastAttemptAt = Number(values.lastAttemptAt);
    const nextAttemptAt = Number(values.nextAttemptAt);
    const idleTimeMs = Number(values.idleTimeMs);
    if (
      !Number.isSafeInteger(deliveryCount) ||
      deliveryCount < 1 ||
      !Number.isFinite(lastAttemptAt) ||
      !Number.isFinite(nextAttemptAt) ||
      !Number.isFinite(idleTimeMs)
    ) {
      return null;
    }
    return {
      eventId: values.eventId,
      entryId: values.entryId,
      stream: values.stream as EventStreamName,
      deliveryCount,
      lastAttemptAt,
      nextAttemptAt,
      idleTimeMs,
      lastError: values.lastError ?? '',
    };
  }

  private async ensureGroups(redis: Redis): Promise<void> {
    for (const stream of this.config.streams) {
      try {
        await createConsumerGroup(stream, this.config.group, '0', redis);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('BUSYGROUP')) throw error;
      }
    }
  }

  private async process(
    redis: Redis,
    stream: EventStreamName,
    entryId: string,
    rawFields: string[],
    confirm: () => Promise<void>,
  ): Promise<void> {
    const fields = fieldRecord(rawFields);
    if (!this.config.supportedEvents.includes(fields.event as EventType)) {
      await confirm();
      return;
    }
    await this.processEvent(fields.event as EventType, fields.eventId ?? entryId, fields.payload);
    await confirm();
  }

  private async deadLetter(
    redis: Redis,
    stream: EventStreamName,
    entryId: string,
    rawFields: string[],
    error: Error,
    confirm: () => Promise<void>,
  ): Promise<void> {
    const fields = fieldRecord(rawFields);
    const savedId = await addStreamEntry(
      this.config.deadLetterStream,
      {
        sourceStream: stream,
        sourceEntryId: entryId,
        consumerGroup: this.config.group,
        event: fields.event ?? '',
        eventId: fields.eventId ?? entryId,
        payload: fields.payload ?? '',
        originalFields: JSON.stringify(rawFields),
        errorName: error.name,
        errorMessage: error.message,
        failedAt: new Date().toISOString(),
      },
      redis,
    );
    if (!savedId) throw new Error(`Failed to publish event to ${this.config.deadLetterStream}`);
    await confirm();
  }

  private async scheduleRetry(
    redis: Redis,
    stream: EventStreamName,
    entryId: string,
    rawFields: string[],
    deliveryCount: number,
    error: unknown,
    lastAttemptAt: number = Date.now(),
  ): Promise<void> {
    const idleTimeMs =
      deliveryCount >= this.config.retryMaxAttempts ? 0 : this.retryDelay(deliveryCount);
    const nextAttemptAt = lastAttemptAt + idleTimeMs;
    await saveHashAndSchedule(
      this.metadataKey(stream, entryId),
      {
        eventId: fieldRecord(rawFields).eventId ?? entryId,
        entryId,
        stream,
        deliveryCount,
        lastAttemptAt,
        nextAttemptAt,
        idleTimeMs,
        lastError: errorMessage(error),
      },
      this.config.retryScheduleKey,
      nextAttemptAt,
      this.member(stream, entryId),
      redis,
    );
  }

  private async removeRetry(redis: Redis, stream: EventStreamName, entryId: string): Promise<void> {
    await removeHashAndSchedule(
      this.metadataKey(stream, entryId),
      this.config.retryScheduleKey,
      this.member(stream, entryId),
      redis,
    );
  }

  async processNewEvent(
    stream: EventStreamName,
    entryId: string,
    fields: string[],
    redis: Redis = this.primaryRedis,
  ): Promise<void> {
    const confirm = async () => {
      await acknowledge(stream, this.config.group, entryId, redis);
    };
    try {
      await this.process(redis, stream, entryId, fields, confirm);
    } catch (error) {
      Logger.error(`${this.name} failed to handle event`, { entryId, error });
      if (error instanceof InvalidPayloadError || this.config.retryMaxAttempts === 1) {
        const reason =
          error instanceof InvalidPayloadError
            ? error
            : new RetryAttemptsExhaustedError(this.config.retryMaxAttempts, errorMessage(error));
        try {
          await this.deadLetter(redis, stream, entryId, fields, reason, confirm);
        } catch {
          // A falha auxiliar mantém a entrada pendente e não gera outro log.
        }
      } else {
        try {
          await this.scheduleRetry(redis, stream, entryId, fields, 1, error);
        } catch {
          // A falha auxiliar mantém a entrada pendente e não gera outro log.
        }
      }
    }
  }

  async reconcilePendingEvents(redis: Redis = this.retryRedis): Promise<void> {
    for (const stream of this.config.streams) {
      let startId = '-';
      let hasMore = true;
      while (hasMore) {
        const pending = await listPending(
          stream,
          this.config.group,
          startId,
          '+',
          this.config.retryReconcileBatchSize,
          redis,
        );
        if (pending.length === 0) {
          hasMore = false;
          continue;
        }
        for (const [entryId, , idleTime, deliveryCount] of pending) {
          if (Object.keys(await getHash(this.metadataKey(stream, entryId), redis)).length === 0) {
            await this.scheduleRetry(
              redis,
              stream,
              entryId,
              [],
              Math.max(deliveryCount, 1),
              'Recovered pending event without retry metadata',
              Date.now() - idleTime,
            );
          }
        }
        if (pending.length < this.config.retryReconcileBatchSize) {
          hasMore = false;
        } else {
          startId = `(${pending[pending.length - 1][0]}`;
        }
      }
    }
  }

  async retryPendingEvents(
    redis: Redis = this.retryRedis,
    consumerName: string = `${this.consumerName}-retry`,
  ): Promise<void> {
    const due = await listSortedSetByScore(
      this.config.retryScheduleKey,
      '-inf',
      Date.now(),
      0,
      this.config.batchSize,
      redis,
    );
    for (const member of due) {
      const separator = member.indexOf(':');
      if (separator < 1) {
        await removeSortedSetMember(this.config.retryScheduleKey, member, redis);
        continue;
      }
      const stream = member.slice(0, separator) as EventStreamName;
      const entryId = member.slice(separator + 1);
      if (!this.config.streams.includes(stream)) {
        await removeSortedSetMember(this.config.retryScheduleKey, member, redis);
        continue;
      }
      const metadataKey = this.metadataKey(stream, entryId);
      const state = this.parseState(await getHash(metadataKey, redis));
      if (!state || state.stream !== stream || state.entryId !== entryId) {
        await this.removeRetry(redis, stream, entryId);
        continue;
      }
      const claimed = await claimPendingEntry(
        stream,
        this.config.group,
        consumerName,
        state.idleTimeMs,
        entryId,
        redis,
      );
      const message = claimed[0];
      if (!message) {
        const pending = await listPending(stream, this.config.group, entryId, entryId, 1, redis);
        if (pending.length === 0) await this.removeRetry(redis, stream, entryId);
        continue;
      }
      await this.retryMessage(redis, stream, member, metadataKey, state, message);
    }
  }

  private async retryMessage(
    redis: Redis,
    stream: EventStreamName,
    member: string,
    metadataKey: string,
    state: RetryState,
    [entryId, fields]: StreamMessage,
  ): Promise<void> {
    const confirm = () =>
      acknowledgeAndRemoveHashAndSchedule(
        stream,
        this.config.group,
        entryId,
        metadataKey,
        this.config.retryScheduleKey,
        member,
        redis,
      );
    if (state.deliveryCount >= this.config.retryMaxAttempts) {
      const nextAttemptAt = Date.now() + this.config.retryProcessingLeaseMs;
      await saveHashAndSchedule(
        metadataKey,
        { nextAttemptAt },
        this.config.retryScheduleKey,
        nextAttemptAt,
        member,
        redis,
      );
      try {
        await this.deadLetter(
          redis,
          stream,
          entryId,
          fields,
          new RetryAttemptsExhaustedError(this.config.retryMaxAttempts, state.lastError),
          confirm,
        );
      } catch {
        // A falha auxiliar mantém a entrada pendente e não gera log.
      }
      return;
    }
    const deliveryCount = state.deliveryCount + 1;
    const lastAttemptAt = Date.now();
    const nextAttemptAt = lastAttemptAt + this.config.retryProcessingLeaseMs;
    await saveHashAndSchedule(
      metadataKey,
      {
        eventId: fieldRecord(fields).eventId ?? state.eventId,
        deliveryCount,
        lastAttemptAt,
        nextAttemptAt,
      },
      this.config.retryScheduleKey,
      nextAttemptAt,
      member,
      redis,
    );
    try {
      await this.process(redis, stream, entryId, fields, confirm);
    } catch (error) {
      Logger.error(`${this.name} failed to retry event`, { entryId, deliveryCount, error });
      if (error instanceof InvalidPayloadError || deliveryCount >= this.config.retryMaxAttempts) {
        if (!(error instanceof InvalidPayloadError)) {
          await setHash(metadataKey, { lastError: errorMessage(error) }, redis);
        }
        const reason =
          error instanceof InvalidPayloadError
            ? error
            : new RetryAttemptsExhaustedError(this.config.retryMaxAttempts, errorMessage(error));
        try {
          await this.deadLetter(redis, stream, entryId, fields, reason, confirm);
        } catch {
          // A falha auxiliar mantém a entrada pendente e não gera outro log.
        }
      } else {
        try {
          await this.scheduleRetry(redis, stream, entryId, fields, deliveryCount, error);
        } catch {
          // A falha auxiliar mantém a entrada pendente e não gera outro log.
        }
      }
    }
  }

  private async consumeLoop(): Promise<void> {
    while (this.running) {
      try {
        await this.ensureGroups(this.primaryRedis);
        const response = await readConsumerGroup(
          this.config.group,
          this.consumerName,
          this.config.streams,
          this.config.batchSize,
          this.config.readBlockMs,
          this.primaryRedis,
        );
        for (const [stream, messages] of response ?? []) {
          for (const [entryId, fields] of messages) {
            if (!this.running) break;
            await this.processNewEvent(stream as EventStreamName, entryId, fields);
          }
        }
      } catch {
        if (!this.running) break;
        await new Promise((resolve) => setTimeout(resolve, this.config.readErrorDelayMs));
      }
    }
  }

  private async retryLoop(): Promise<void> {
    while (this.running) {
      try {
        await this.ensureGroups(this.retryRedis);
        if (Date.now() - this.lastReconciliationAt >= this.config.retryReconcileIntervalMs) {
          await this.reconcilePendingEvents();
          this.lastReconciliationAt = Date.now();
        }
        await this.retryPendingEvents();
      } catch {
        if (!this.running) break;
      }
      if (this.running) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            this.cancelRetryWait = undefined;
            resolve();
          }, this.config.retryIntervalMs);
          this.cancelRetryWait = () => {
            clearTimeout(timeout);
            this.cancelRetryWait = undefined;
            resolve();
          };
        });
      }
    }
  }
}
