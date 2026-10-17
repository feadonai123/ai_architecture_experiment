import { EventHandler } from '../shared/base/eventHandler.base';
import { Consumer } from '../shared/consumers/Consumer';
import { EventDispatcher } from '../shared/consumers/EventDispatcher';
import { EventType } from '../shared/events/EventType';

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
