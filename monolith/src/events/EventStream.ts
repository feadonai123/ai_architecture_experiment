export class EventStream {
  static readonly Orders = 'orders';
  static readonly All = [EventStream.Orders] as const;

  private constructor() {}
}

export type EventStreamName = (typeof EventStream.All)[number];
