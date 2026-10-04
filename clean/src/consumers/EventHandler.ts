import { Event } from '../events/Event';

export interface EventHandler {
  handle(event: Event<unknown>): Promise<void>;
}
