import { Event } from '../events/Event';
import { IEventService } from '../ports/IEventService';
import { Logger } from '../utils/Logger';
import { ConsumerMessage } from './consumerMessage';
import { EventDispatcher } from './eventDispatcher';
import { IConsumerSettings } from './iConsumerSettings';

export abstract class Consumer {
  protected running = false;
  private consumeDone?: Promise<void>;
  private retryDone?: Promise<void>;

  protected constructor(
    protected readonly eventService: IEventService,
    protected readonly dispatcher: EventDispatcher,
    protected readonly settings: IConsumerSettings,
    protected readonly consumerName: string,
  ) {}

  protected abstract initialize(): Promise<void>;
  protected abstract retryLoop(): Promise<void>;
  protected abstract stopInfrastructure(): void;
  protected abstract readMessages(): Promise<ConsumerMessage[]>;
  protected abstract deserialize(message: ConsumerMessage): Event<unknown> | null;
  protected abstract ack(message: ConsumerMessage): Promise<void>;
  protected abstract ackUnsupported(message: ConsumerMessage): Promise<void>;
  protected abstract handleFailure(message: ConsumerMessage, error: unknown): Promise<void>;
  protected abstract confirmRetry(message: ConsumerMessage): Promise<void>;
  protected abstract handleRetryFailure(
    message: ConsumerMessage,
    error: unknown,
    deliveryCount: number,
  ): Promise<void>;
  protected abstract handleAckFailure(message: ConsumerMessage, error: unknown): Promise<void>;
  protected abstract handleReadFailure(error: unknown): Promise<void>;

  async start(): Promise<void> {
    if (this.running) return;
    await this.initialize();
    this.running = true;
    this.consumeDone = this.consume();
    this.retryDone = this.retryLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.stopInfrastructure();
    await Promise.allSettled([this.consumeDone, this.retryDone]);
    this.consumeDone = undefined;
    this.retryDone = undefined;
  }

  protected async dispatchMessage(message: ConsumerMessage): Promise<boolean> {
    const event = this.deserialize(message);
    if (!event) return false;
    event.getPayload();
    return this.dispatcher.dispatch(event);
  }

  private async processFailure(message: ConsumerMessage, error: unknown): Promise<void> {
    Logger.error(`${this.consumerName} failed to handle event`, { entryId: message.id, error });
    await this.handleFailure(message, error);
  }

  private async processRetryFailure(
    message: ConsumerMessage,
    error: unknown,
    deliveryCount: number,
  ): Promise<void> {
    Logger.error(`${this.consumerName} failed to retry event`, {
      entryId: message.id,
      deliveryCount,
      error,
    });
    await this.handleRetryFailure(message, error, deliveryCount);
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
            await this.processFailure(message, error);
          } catch {
            // A falha auxiliar permanece silenciosa conforme a política de logs do consumer.
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

  async retry(message: ConsumerMessage, deliveryCount: number): Promise<void> {
    try {
      await this.dispatchMessage(message);
    } catch (error) {
      try {
        await this.processRetryFailure(message, error, deliveryCount);
      } catch {
        // A falha auxiliar permanece silenciosa conforme a política de logs do consumer.
      }
      return;
    }

    try {
      await this.confirmRetry(message);
    } catch (error) {
      await this.handleAckFailure(message, error);
    }
  }
}
