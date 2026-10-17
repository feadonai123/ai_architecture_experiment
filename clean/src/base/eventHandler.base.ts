import { Event } from '../events/Event';
import { Logger } from '../utils/Logger';

export abstract class EventHandler {
  protected constructor(private readonly consumerName: string) {}

  async handle(event: Event<unknown>): Promise<void> {
    await this.execute(event);
    const payload = event.getPayload();
    Logger.info(`${this.consumerName} consumer handled ${event.getType()}`, {
      eventId: event.getId(),
      ...(typeof payload === 'object' && payload !== null ? payload : { payload }),
    });
  }

  protected abstract execute(event: Event<unknown>): Promise<void>;
}
