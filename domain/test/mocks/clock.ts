export function mockClock(timestamp: string): jest.Mock<Date, []> {
  return jest.fn(() => new Date(timestamp));
}
