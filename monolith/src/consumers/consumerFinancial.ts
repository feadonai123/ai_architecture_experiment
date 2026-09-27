import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { EventStream, EventStreamName } from '../events/EventStream';
import { EventType } from '../events/EventType';
import { OrderCreatedEvent, OrderCreatedPayload } from '../events/OrderCreatedEvent';
import { Logger } from '../utils/Logger';

const GROUP = 'financial';
const STREAMS = [EventStream.Orders] as const;
const SUPPORTED_EVENTS = [EventType.OrderCreated] as const;
const BATCH_SIZE = 10;
const READ_BLOCK_MS = 5000;

type StreamMessage = [entryId: string, fields: string[]];
type StreamResponse = [stream: EventStreamName, messages: StreamMessage[]][];
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
  eventId: string,
  payload: OrderCreatedPayload,
): Promise<void> {
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
  redis: Redis,
  stream: EventStreamName,
  entryId: string,
  rawFields: string[],
): Promise<void> {
  const fields = toFieldRecord(rawFields);

  if (!isSupportedEvent(fields.event)) {
    Logger.warn('financial consumer ignored unsupported event', {
      entryId,
      event: fields.event,
    });
    await redis.xack(stream, GROUP, entryId);
    return;
  }

  switch (fields.event) {
    case EventType.OrderCreated: {
      const event = new OrderCreatedEvent(fields.eventId ?? entryId, fields.payload);
      await handleOrderCreated(event.getId(), event.getPayload());
      break;
    }
  }

  await redis.xack(stream, GROUP, entryId);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function startFinancialConsumer(redis: Redis): FinancialConsumer {
  const consumerRedis = redis.duplicate();
  const consumerName = `financial-${process.pid}-${uuidv4()}`;
  let running = true;

  const done = (async () => {
    while (running) {
      try {
        await ensureGroups(consumerRedis);
        const response = await readEvents(consumerRedis, consumerName);

        for (const [stream, messages] of response ?? []) {
          for (const [entryId, fields] of messages) {
            try {
              await processEvents(consumerRedis, stream, entryId, fields);
            } catch (error) {
              Logger.error('financial consumer failed to handle event', {
                entryId,
                error,
              });
            }
          }
        }
      } catch (error) {
        if (!running) {
          break;
        }
        Logger.error('financial consumer failed to read Redis Stream', error);
        await wait(1000);
      }
    }
  })();

  return {
    async stop(): Promise<void> {
      running = false;
      consumerRedis.disconnect();
      await done;
    },
  };
}
