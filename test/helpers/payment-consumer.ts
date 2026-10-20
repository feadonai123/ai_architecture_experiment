import { v4 as uuidv4 } from 'uuid';
import { requireEnv } from './env';
import { getTestRedis } from './setup';
export async function waitUntil(
  predicate: () => Promise<boolean>,
  timeoutMs = 10000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Payment consumer condition was not met');
}
export function fieldsToRecord(fields: string[]): Record<string, string> {
  return Object.fromEntries(
    Array.from({ length: fields.length / 2 }, (_, i) => [fields[i * 2], fields[i * 2 + 1]]),
  );
}
export async function publishPaymentEvent(type: string, payload: unknown): Promise<string> {
  const id = await getTestRedis().xadd(
    'payments',
    '*',
    'event',
    type,
    'eventId',
    uuidv4(),
    'timestamp',
    new Date().toISOString(),
    'payload',
    typeof payload === 'string' ? payload : JSON.stringify(payload),
  );
  if (!id) throw new Error('Could not publish payment integration event');
  return id;
}
export async function wasDelivered(id: string): Promise<boolean> {
  try {
    const groups = (await getTestRedis().xinfo('GROUPS', 'payments')) as string[][];
    const group = groups
      .map(fieldsToRecord)
      .find((g) => g.name === requireEnv('ORDER_CONSUMER_GROUP'));
    return group?.['last-delivered-id'] === id && Number(group.pending) === 0;
  } catch {
    return false;
  }
}
