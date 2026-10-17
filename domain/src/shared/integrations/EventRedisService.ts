import type Redis from 'ioredis';
import { DbManager } from '../../manager/db.manager';
import { Event } from '../messaging/Event';
import { IEventService } from '../messaging/EventService';

export class EventRedisService implements IEventService {
  constructor(private readonly redis: Redis) {}

  async publishNow(stream: string, fields: Record<string, string>): Promise<string> {
    const values = Object.entries(fields).flatMap(([key, value]) => [key, value]);
    const entryId = await this.redis.xadd(stream, '*', ...values);
    if (!entryId) throw new Error(`Failed to publish event to Redis Stream: ${stream}`);
    return entryId;
  }

  async publishAfterCommit(event: Event<unknown>): Promise<void> {
    const fields = {
      event: event.getType(),
      eventId: event.getId(),
      timestamp: event.getTimestamp().toISOString(),
      payload: JSON.stringify(event.getPayload()),
    };
    DbManager.registerAfterCommit(async () => {
      await this.publishNow(event.getStream(), fields);
    });
  }
}
