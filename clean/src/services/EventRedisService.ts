import type Redis from 'ioredis';
import { Event } from '../events/Event';
import { DbManager } from '../manager/db.manager';
import { IEventService } from '../ports/IEventService';
import { addStreamEntry } from './redis';

export class EventRedisService implements IEventService {
  constructor(private readonly redis: Redis) { }

  async publishAfterCommit(event: Event<unknown>): Promise<void> {
    const fields = {
      event: event.getType(),
      eventId: event.getId(),
      timestamp: event.getTimestamp().toISOString(),
      payload: JSON.stringify(event.getPayload()),
    };
    DbManager.registerAfterCommit(async () => {
      const entryId = await addStreamEntry(event.getStream(), fields, this.redis);
      if (!entryId) throw new Error(`Failed to publish ${event.getType()} to Redis Stream`);
    });
  }
}
