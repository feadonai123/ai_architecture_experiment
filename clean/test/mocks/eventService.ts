import { IEventService } from '../../src/ports/EventService';

export function mockEventService(): jest.Mocked<IEventService> {
  return {
    publishAfterCommit: jest.fn().mockResolvedValue(undefined),
    publishNow: jest.fn().mockResolvedValue('1-0'),
  };
}
