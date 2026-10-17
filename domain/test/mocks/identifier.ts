export function mockSequentialIdentifier(prefix: string): jest.Mock<string, []> {
  let sequence = 0;
  return jest.fn(() => `${prefix}${++sequence}`);
}
