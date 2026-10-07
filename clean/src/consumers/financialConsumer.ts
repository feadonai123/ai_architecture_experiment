import { EventHandler } from '../base/eventHandler.base';
import { EventType } from '../events/EventType';
import { Consumer } from './consumer';
import { EventDispatcher } from './eventDispatcher';

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
