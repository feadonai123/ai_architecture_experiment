import { Event } from '../events/Event';
import { EventType } from '../events/EventType';
import { EventHandler } from './EventHandler';

export class EventDispatcher {
  private readonly handlers = new Map<EventType, EventHandler[]>();

  register(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  hasHandlers(eventType: EventType): boolean {
    return (this.handlers.get(eventType)?.length ?? 0) > 0;
  }

  async dispatch(event: Event<unknown>): Promise<boolean> {
    const handlers = this.handlers.get(event.getType());
    if (!handlers?.length) return false;
    for (const handler of handlers) await handler.handle(event);
    return true;
  }
}
