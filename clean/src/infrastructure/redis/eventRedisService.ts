import type Redis from 'ioredis';
import { RedisEventPublicationError } from '../../errors/redisEventPublicationError';
import { Event } from '../../events/Event';
import { DbManager } from '../../manager/db.manager';
import { IEventService } from '../../ports/IEventService';
import { addStreamEntry } from './redisStreams';

export class EventRedisService implements IEventService {
  constructor(private readonly redis: Redis) {}

  async publishNow(stream: string, fields: Record<string, string>): Promise<string> {
    const entryId = await addStreamEntry(this.redis, stream, fields);
    if (!entryId) throw new RedisEventPublicationError(stream);
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
