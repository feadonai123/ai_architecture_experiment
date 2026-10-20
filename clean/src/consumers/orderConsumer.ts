import { EventHandler } from '../base/eventHandler.base';
import { Consumer } from './consumer';
import { EventDispatcher } from './eventDispatcher';
import { EventType } from '../events/EventType';

export class OrderConsumer {
  constructor(
    private readonly consumer: Consumer,
    dispatcher: EventDispatcher,
    approved: EventHandler,
    declined: EventHandler,
  ) {
    dispatcher.register(EventType.PaymentApproved, approved);
    dispatcher.register(EventType.PaymentDeclinedError, declined);
  }
  start(): Promise<void> {
    return this.consumer.start();
  }
  stop(): Promise<void> {
    return this.consumer.stop();
  }
}
