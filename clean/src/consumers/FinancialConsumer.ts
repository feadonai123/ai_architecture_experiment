import { EventType } from '../events/EventType';
import { Consumer } from './Consumer';
import { EventDispatcher } from './EventDispatcher';
import { EventHandler } from './EventHandler';

export class FinancialConsumer {
  constructor(
    private readonly consumer: Consumer,
    dispatcher: EventDispatcher,
    orderCreatedHandler: EventHandler,
  ) {
    dispatcher.register(EventType.OrderCreated, orderCreatedHandler);
  }

  start(): Promise<void> {
    return this.consumer.start();
  }

  stop(): Promise<void> {
    return this.consumer.stop();
  }
}
