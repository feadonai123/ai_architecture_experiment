import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../entities/Order';
import { OrderPayment } from '../entities/OrderPayment';
import { OrderPaymentStatus } from '../enums/OrderPaymentStatus';
import { OrderStatus } from '../enums/OrderStatus';
import { InvalidPayloadError, OrderNotFoundError, RetryAttemptsExhaustedError } from '../errors';
import { EventStream, EventStreamName } from '../events/EventStream';
import { EventType } from '../events/EventType';
import { OrderCreatedEvent, OrderCreatedPayload } from '../events/OrderCreatedEvent';
import { requireEnv } from '../helpers';
import { Logger } from '../utils/Logger';

function positiveIntegerEnv(name: string): number {
  const value = Number(requireEnv(name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid positive integer environment variable: ${name}`);
  }
  return value;
}

const GROUP = requireEnv('FINANCIAL_CONSUMER_GROUP');
const STREAMS = requireEnv('FINANCIAL_CONSUMER_STREAMS')
  .split(',')
  .map((value) => value.trim())
  .map((value) => {
    if (!EventStream.All.some((stream) => stream === value)) {
      throw new Error(`Invalid FINANCIAL_CONSUMER_STREAMS value: ${value}`);
    }
    return value as EventStreamName;
  });
const SUPPORTED_EVENTS = requireEnv('FINANCIAL_CONSUMER_SUPPORTED_EVENTS')
  .split(',')
  .map((value) => value.trim())
  .map((value) => {
    if (value !== EventType.OrderCreated) {
      throw new Error(`Invalid FINANCIAL_CONSUMER_SUPPORTED_EVENTS value: ${value}`);
    }
    return value as EventType;
  });
if (
  SUPPORTED_EVENTS.length !== 1 ||
  SUPPORTED_EVENTS[0] !== EventType.OrderCreated
) {
  throw new Error('FINANCIAL_CONSUMER_SUPPORTED_EVENTS must match the handled events');
}
const BATCH_SIZE = positiveIntegerEnv('FINANCIAL_CONSUMER_BATCH_SIZE');
const READ_BLOCK_MS = positiveIntegerEnv('FINANCIAL_CONSUMER_READ_BLOCK_MS');
const READ_ERROR_DELAY_MS = positiveIntegerEnv('FINANCIAL_CONSUMER_READ_ERROR_DELAY_MS');
const RETRY_INTERVAL_MS = positiveIntegerEnv('FINANCIAL_CONSUMER_RETRY_INTERVAL_MS');
const RETRY_RECONCILE_INTERVAL_MS = positiveIntegerEnv(
  'FINANCIAL_CONSUMER_RETRY_RECONCILE_INTERVAL_MS',
);
const RETRY_PROCESSING_LEASE_MS = positiveIntegerEnv(
  'FINANCIAL_CONSUMER_RETRY_PROCESSING_LEASE_MS',
);
const RETRY_RECONCILE_BATCH_SIZE = positiveIntegerEnv(
  'FINANCIAL_CONSUMER_RETRY_RECONCILE_BATCH_SIZE',
);
const RETRY_SCHEDULE_KEY = requireEnv('FINANCIAL_CONSUMER_RETRY_SCHEDULE_KEY');
const RETRY_EVENT_KEY_PREFIX = requireEnv('FINANCIAL_CONSUMER_RETRY_EVENT_KEY_PREFIX');
const RETRY_MAX_ATTEMPTS = positiveIntegerEnv('FINANCIAL_CONSUMER_RETRY_MAX_ATTEMPTS');
const DEAD_LETTER_STREAM = requireEnv('FINANCIAL_CONSUMER_DEAD_LETTER_STREAM');

if (STREAMS.some((stream) => stream === DEAD_LETTER_STREAM)) {
  throw new Error('FINANCIAL_CONSUMER_DEAD_LETTER_STREAM must not be a watched stream');
}

type StreamMessage = [entryId: string, fields: string[]];
type StreamResponse = [stream: EventStreamName, messages: StreamMessage[]][];
type PendingEntry = [entryId: string, consumer: string, idleTime: number, deliveryCount: number];
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
type SupportedEvent = (typeof SUPPORTED_EVENTS)[number];

export type FinancialConsumer = {
  stop(): Promise<void>;
};

function toFieldRecord(fields: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (let index = 0; index < fields.length; index += 2) {
    record[fields[index]] = fields[index + 1];
  }
  return record;
}

export async function handleOrderCreated(
  dataSource: DataSource,
  eventId: string,
  payload: OrderCreatedPayload,
): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const orderRepository = manager.getRepository(Order);
    const orderPaymentRepository = manager.getRepository(OrderPayment);
    const order = await orderRepository.findOne({
      where: { id: payload.orderId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!order) {
      throw new OrderNotFoundError(payload.orderId);
    }

    const existingPayment = await orderPaymentRepository.findOne({
      where: { orderId: payload.orderId },
    });
    if (existingPayment) {
      return;
    }

    const orderPayment = orderPaymentRepository.create({
      orderId: order.id,
      status: OrderPaymentStatus.PENDING,
      paymentDetails: null,
      paidAt: null,
      createdAt: new Date(),
    });
    await orderPaymentRepository.save(orderPayment);

    order.status = OrderStatus.PAYMENT_PENDING;
    await orderRepository.save(order);
  });

  Logger.info(`financial consumer handled ${EventType.OrderCreated}`, {
    eventId,
    orderId: payload.orderId,
    userId: payload.userId,
    items: payload.items,
  });
}

function isSupportedEvent(event: string | undefined): event is SupportedEvent {
  return SUPPORTED_EVENTS.some((supportedEvent) => supportedEvent === event);
}

async function ensureGroups(redis: Redis): Promise<void> {
  for (const stream of STREAMS) {
    try {
      await redis.xgroup('CREATE', stream, GROUP, '0', 'MKSTREAM');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }
}

export async function readEvents(
  redis: Redis,
  consumerName: string,
): Promise<StreamResponse | null> {
  return (await redis.xreadgroup(
    'GROUP',
    GROUP,
    consumerName,
    'COUNT',
    BATCH_SIZE,
    'BLOCK',
    READ_BLOCK_MS,
    'STREAMS',
    ...STREAMS,
    ...STREAMS.map(() => '>'),
  )) as StreamResponse | null;
}

export async function processEvents(
  dataSource: DataSource,
  redis: Redis,
  stream: EventStreamName,
  entryId: string,
  rawFields: string[],
  acknowledge?: () => Promise<void>,
): Promise<void> {
  const fields = toFieldRecord(rawFields);

  if (!isSupportedEvent(fields.event)) {
    if (acknowledge) {
      await acknowledge();
    } else {
      await redis.xack(stream, GROUP, entryId);
    }
    return;
  }

  switch (fields.event) {
    case EventType.OrderCreated: {
      const event = new OrderCreatedEvent(fields.eventId ?? entryId, fields.payload);
      await handleOrderCreated(dataSource, event.getId(), event.getPayload());
      break;
    }
  }

  if (acknowledge) {
    await acknowledge();
  } else {
    await redis.xack(stream, GROUP, entryId);
  }
}

function retryMember(stream: EventStreamName, entryId: string): string {
  return `${stream}:${entryId}`;
}

function retryEventKey(stream: EventStreamName, entryId: string): string {
  return `${RETRY_EVENT_KEY_PREFIX}:${stream}:${entryId}`;
}

function retryDelay(deliveryCount: number): number {
  const random = Math.floor(Math.random() * 30);
  const delaySeconds = (deliveryCount - 1) ** 4 + 15 + random * deliveryCount;
  const delayMs = delaySeconds * 1000;
  if (!Number.isSafeInteger(delayMs)) {
    throw new Error(`Retry delay exceeds the safe integer range: ${deliveryCount}`);
  }
  return delayMs;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

async function sendToDeadLetter(
  redis: Redis,
  stream: EventStreamName,
  entryId: string,
  rawFields: string[],
  error: Error,
  acknowledge: () => Promise<void>,
): Promise<void> {
  const fields = toFieldRecord(rawFields);
  const deadLetterEntryId = await redis.xadd(
    DEAD_LETTER_STREAM,
    '*',
    'sourceStream',
    stream,
    'sourceEntryId',
    entryId,
    'consumerGroup',
    GROUP,
    'event',
    fields.event ?? '',
    'eventId',
    fields.eventId ?? entryId,
    'payload',
    fields.payload ?? '',
    'originalFields',
    JSON.stringify(rawFields),
    'errorName',
    error.name,
    'errorMessage',
    error.message,
    'failedAt',
    new Date().toISOString(),
  );
  if (!deadLetterEntryId) {
    throw new Error(`Failed to publish event to ${DEAD_LETTER_STREAM}`);
  }
  await acknowledge();
}

async function acknowledgeRetriedEvent(
  redis: Redis,
  stream: EventStreamName,
  entryId: string,
): Promise<void> {
  const results = await redis
    .multi()
    .xack(stream, GROUP, entryId)
    .zrem(RETRY_SCHEDULE_KEY, retryMember(stream, entryId))
    .del(retryEventKey(stream, entryId))
    .exec();
  if (!results || results.some(([commandError]) => commandError)) {
    throw new Error(`Failed to acknowledge retried event: ${entryId}`);
  }
}

function parseRetryState(values: Record<string, string>): RetryState | null {
  if (
    !values.eventId ||
    !values.entryId ||
    !EventStream.All.some((stream) => stream === values.stream)
  ) {
    return null;
  }

  const deliveryCount = Number(values.deliveryCount);
  const lastAttemptAt = Number(values.lastAttemptAt);
  const nextAttemptAt = Number(values.nextAttemptAt);
  const idleTimeMs = Number(values.idleTimeMs);
  if (
    !Number.isInteger(deliveryCount) ||
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

export async function scheduleRetry(
  redis: Redis,
  stream: EventStreamName,
  entryId: string,
  rawFields: string[],
  deliveryCount: number,
  error: unknown,
  lastAttemptAt: number = Date.now(),
): Promise<void> {
  const fields = toFieldRecord(rawFields);
  const idleTimeMs = deliveryCount >= RETRY_MAX_ATTEMPTS ? 0 : retryDelay(deliveryCount);
  const nextAttemptAt = lastAttemptAt + idleTimeMs;
  const member = retryMember(stream, entryId);
  const metadataKey = retryEventKey(stream, entryId);

  await redis
    .multi()
    .hset(metadataKey, {
      eventId: fields.eventId ?? entryId,
      entryId,
      stream,
      deliveryCount,
      lastAttemptAt,
      nextAttemptAt,
      idleTimeMs,
      lastError: errorMessage(error),
    })
    .zadd(RETRY_SCHEDULE_KEY, nextAttemptAt, member)
    .exec();
}

async function removeRetryState(
  redis: Redis,
  stream: EventStreamName,
  entryId: string,
): Promise<void> {
  await redis
    .multi()
    .zrem(RETRY_SCHEDULE_KEY, retryMember(stream, entryId))
    .del(retryEventKey(stream, entryId))
    .exec();
}

export async function reconcilePendingEvents(redis: Redis): Promise<void> {
  for (const stream of STREAMS) {
    let startId = '-';
    let hasMorePendingEntries = true;

    while (hasMorePendingEntries) {
      const pendingEntries = (await redis.xpending(
        stream,
        GROUP,
        startId,
        '+',
        RETRY_RECONCILE_BATCH_SIZE,
      )) as PendingEntry[];

      if (pendingEntries.length === 0) {
        hasMorePendingEntries = false;
        continue;
      }

      for (const [entryId, , idleTime, deliveryCount] of pendingEntries) {
        const metadataKey = retryEventKey(stream, entryId);
        const currentState = await redis.hgetall(metadataKey);
        if (Object.keys(currentState).length === 0) {
          const lastAttemptAt = Date.now() - idleTime;
          await scheduleRetry(
            redis,
            stream,
            entryId,
            [],
            Math.max(deliveryCount, 1),
            'Recovered pending event without retry metadata',
            lastAttemptAt,
          );
        }
      }

      if (pendingEntries.length < RETRY_RECONCILE_BATCH_SIZE) {
        break;
      }
      startId = `(${pendingEntries[pendingEntries.length - 1][0]}`;
    }
  }
}

export async function retryPendingEvents(
  dataSource: DataSource,
  redis: Redis,
  consumerName: string,
): Promise<void> {

  // Coleta todos os itens que estão para retry prontos para retry e com um limite de pegar no máximo dez
  const dueMembers = await redis.zrange(
    RETRY_SCHEDULE_KEY,
    '-inf',
    Date.now(),
    'BYSCORE',
    'LIMIT',
    0,
    BATCH_SIZE,
  );

  // loop para item
  for (const member of dueMembers) {

    // separa o item em stream e entryId, se não tiver no formato certo joga fora
    const separatorIndex = member.indexOf(':');
    if (separatorIndex < 1) {
      await redis.zrem(RETRY_SCHEDULE_KEY, member);
      continue;
    }


    const stream = member.slice(0, separatorIndex);
    const entryId = member.slice(separatorIndex + 1);

    // Verifica se stream é válido, se não for remove do retry
    if (!EventStream.All.some((eventStream) => eventStream === stream)) {
      await redis.zrem(RETRY_SCHEDULE_KEY, member);
      continue;
    }

    const eventStream = stream as EventStreamName;
    const metadataKey = retryEventKey(eventStream, entryId);

    // Verifica no hash se existe o item de retry, a partir do entryId e stream, se não existir remove do retry 
    const state = parseRetryState(await redis.hgetall(metadataKey));
    if (!state) {
      await removeRetryState(redis, eventStream, entryId);
      continue;
    }

    // Tenta pegar o item do stream,
    const claimedMessages = (await redis.xclaim(
      eventStream,
      GROUP,
      consumerName,
      state.idleTimeMs,
      entryId,
    )) as StreamMessage[];
    const claimedMessage = claimedMessages[0];

    // Se não conseguir pegar o item do stream
    if (!claimedMessage) {

      // Verifica se o item está na lista de pendentes, caso não esteja remove do retry,caso esteja ele só continua o loop
      const pending = (await redis.xpending(
        eventStream,
        GROUP,
        entryId,
        entryId,
        1,
      )) as PendingEntry[];
      if (pending.length === 0) {
        await removeRetryState(redis, eventStream, entryId);
      }
      continue;
    }

    // converte a messagem clamada para objeto fields 

    const [claimedEntryId, fields] = claimedMessage;
    const claimedFields = toFieldRecord(fields);

    // Função que dará o ack do evento, remove da fila de schedule e remove do hash de retry
    const acknowledge = () => acknowledgeRetriedEvent(redis, eventStream, claimedEntryId);

    // Verifica se a quantidade de tentativas de retry não é maior que o máximo de tentativas
    if (state.deliveryCount >= RETRY_MAX_ATTEMPTS) {

      // Cria uma lease (nova tentativa de retry) para o item, e envia para dead letter, caso não consiga enviar para dead letter loga o erro
      const nextAttemptAt = Date.now() + RETRY_PROCESSING_LEASE_MS;
      await redis
        .multi()
        .hset(metadataKey, { nextAttemptAt })
        .zadd(RETRY_SCHEDULE_KEY, nextAttemptAt, member)
        .exec();
      try {
        await sendToDeadLetter(
          redis,
          eventStream,
          claimedEntryId,
          fields,
          new RetryAttemptsExhaustedError(RETRY_MAX_ATTEMPTS, state.lastError),
          acknowledge,
        );
      } catch {
        // A falha auxiliar mantém a entrada pendente e não gera log.
      }
      continue;
    }

    // Cria um hash de metadata para o item de retry, com a quantidade de tentativas de retry, e cria uma lease (nova tentativa de retry) para o item
    const deliveryCount = state.deliveryCount + 1;
    const attemptStartedAt = Date.now();
    await redis
      .multi()
      .hset(metadataKey, {
        eventId: claimedFields.eventId ?? state.eventId,
        deliveryCount,
        lastAttemptAt: attemptStartedAt,
        nextAttemptAt: attemptStartedAt + RETRY_PROCESSING_LEASE_MS,
      })
      .zadd(RETRY_SCHEDULE_KEY, attemptStartedAt + RETRY_PROCESSING_LEASE_MS, member)
      .exec();
    // tenta processar o item de retry, caso não consiga processar, verifica se é um erro de payload inválido,
    try {
      await processEvents(dataSource, redis, eventStream, claimedEntryId, fields, acknowledge);
    } catch (error) {
      Logger.error('financial failed to retry event', {
        entryId: claimedEntryId,
        deliveryCount,
        error,
      });
      if (error instanceof InvalidPayloadError) {
        try {
          await sendToDeadLetter(redis, eventStream, claimedEntryId, fields, error, acknowledge);
        } catch {
          // A falha auxiliar mantém a entrada pendente e não gera outro log.
        }
      } else if (deliveryCount >= RETRY_MAX_ATTEMPTS) {
        await redis.hset(metadataKey, { lastError: errorMessage(error) });
        try {
          await sendToDeadLetter(
            redis,
            eventStream,
            claimedEntryId,
            fields,
            new RetryAttemptsExhaustedError(RETRY_MAX_ATTEMPTS, errorMessage(error)),
            acknowledge,
          );
        } catch {
          // A falha auxiliar mantém a entrada pendente e não gera outro log.
        }
      } else {
        try {
          await scheduleRetry(redis, eventStream, claimedEntryId, fields, deliveryCount, error);
        } catch {
          // A falha auxiliar mantém a entrada pendente e não gera outro log.
        }
      }
    }
  }
}

export async function processNewEvent(
  dataSource: DataSource,
  redis: Redis,
  stream: EventStreamName,
  entryId: string,
  fields: string[],
): Promise<void> {
  try {
    await processEvents(dataSource, redis, stream, entryId, fields);
  } catch (error) {
    Logger.error('financial failed to handle event', {
      entryId,
      error,
    });
    if (error instanceof InvalidPayloadError) {
      try {
        await sendToDeadLetter(redis, stream, entryId, fields, error, async () => {
          await redis.xack(stream, GROUP, entryId);
        });
      } catch {
        // A falha auxiliar mantém a entrada pendente e não gera outro log.
      }
    } else if (RETRY_MAX_ATTEMPTS === 1) {
      try {
        await sendToDeadLetter(
          redis,
          stream,
          entryId,
          fields,
          new RetryAttemptsExhaustedError(RETRY_MAX_ATTEMPTS, errorMessage(error)),
          async () => {
            await redis.xack(stream, GROUP, entryId);
          },
        );
      } catch {
        // A falha auxiliar mantém a entrada pendente e não gera outro log.
      }
    } else {
      try {
        await scheduleRetry(redis, stream, entryId, fields, 1, error);
      } catch {
        // A falha auxiliar mantém a entrada pendente e não gera outro log.
      }
    }
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function startFinancialConsumer(dataSource: DataSource, redis: Redis): FinancialConsumer {
  const consumerRedis = redis.duplicate();
  const retryRedis = redis.duplicate();
  const consumerName = `financial-${process.pid}-${uuidv4()}`;
  const retryConsumerName = `${consumerName}-retry`;
  let running = true;
  let lastRetryReconciliationAt = 0;
  let cancelRetryWait: (() => void) | undefined;

  const consumeDone = (async () => {
    while (running) {
      try {
        await ensureGroups(consumerRedis);
        const response = await readEvents(consumerRedis, consumerName);

        for (const [stream, messages] of response ?? []) {
          for (const [entryId, fields] of messages) {
            await processNewEvent(dataSource, consumerRedis, stream, entryId, fields);
          }
        }
      } catch {
        if (!running) {
          break;
        }
        await wait(READ_ERROR_DELAY_MS);
      }
    }
  })();

  const retryDone = (async () => {
    while (running) {
      try {
        await ensureGroups(retryRedis);
        if (Date.now() - lastRetryReconciliationAt >= RETRY_RECONCILE_INTERVAL_MS) {
          await reconcilePendingEvents(retryRedis);
          lastRetryReconciliationAt = Date.now();
        }
        await retryPendingEvents(dataSource, retryRedis, retryConsumerName);
      } catch {
        if (!running) {
          break;
        }
      }

      if (running) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            cancelRetryWait = undefined;
            resolve();
          }, RETRY_INTERVAL_MS);
          cancelRetryWait = () => {
            clearTimeout(timeout);
            cancelRetryWait = undefined;
            resolve();
          };
        });
      }
    }
  })();

  return {
    async stop(): Promise<void> {
      running = false;
      cancelRetryWait?.();
      consumerRedis.disconnect();
      retryRedis.disconnect();
      await Promise.all([consumeDone, retryDone]);
    },
  };
}
