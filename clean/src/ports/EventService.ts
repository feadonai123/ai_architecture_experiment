import { Event } from '../events/Event';

export interface IEventService {
  publishAfterCommit(event: Event<unknown>): Promise<void>;
  publishNow(stream: string, fields: Record<string, string>): Promise<string>;
}
