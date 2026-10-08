import { IEventService } from '../../src/shared/messaging/EventService';

export function mockEventService(): jest.Mocked<IEventService> {
  return {
    publishAfterCommit: jest.fn().mockResolvedValue(undefined),
    publishNow: jest.fn().mockResolvedValue('1-0'),
  };
}
