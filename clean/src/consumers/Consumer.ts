import { Event } from '../events/Event';
import { IEventService } from '../ports/IEventService';
import { Logger } from '../utils/Logger';
import { ConsumerMessage } from './ConsumerMessage';
import { EventDispatcher } from './EventDispatcher';
import { IConsumerSettings } from './IConsumerSettings';

export abstract class Consumer {
  protected running = false;

  protected constructor(
    protected readonly eventService: IEventService,
    protected readonly dispatcher: EventDispatcher,
    protected readonly settings: IConsumerSettings,
  ) {}

  abstract initialize(): Promise<void>;
  protected abstract readMessages(): Promise<ConsumerMessage[]>;
  protected abstract deserialize(message: ConsumerMessage): Event<unknown> | null;
  protected abstract ack(message: ConsumerMessage): Promise<void>;
  protected abstract ackUnsupported(message: ConsumerMessage): Promise<void>;
  protected abstract handleFailure(message: ConsumerMessage, error: unknown): Promise<void>;
  protected abstract handleAckFailure(message: ConsumerMessage, error: unknown): Promise<void>;
  protected abstract handleReadFailure(error: unknown): Promise<void>;

  protected async dispatchMessage(message: ConsumerMessage): Promise<boolean> {
    const event = this.deserialize(message);
    if (!event) return false;
    event.getPayload();
    return this.dispatcher.dispatch(event);
  }

  async consume(): Promise<void> {
    while (this.running) {
      let messages: ConsumerMessage[];
      try {
        messages = await this.readMessages();
      } catch (error) {
        if (!this.running) break;
        await this.handleReadFailure(error);
        continue;
      }

      for (const message of messages) {
        if (!this.running) break;
        let handled: boolean;
        try {
          handled = await this.dispatchMessage(message);
        } catch (error) {
          try {
            await this.handleFailure(message, error);
          } catch (failureError) {
            Logger.error('consumer failed to handle processing failure', { message, failureError });
          }
          continue;
        }

        try {
          if (handled) await this.ack(message);
          else await this.ackUnsupported(message);
        } catch (error) {
          await this.handleAckFailure(message, error);
        }
      }
    }
  }
}
