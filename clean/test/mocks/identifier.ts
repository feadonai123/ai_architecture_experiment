export function mockIdentifier(value: string): jest.Mock<string, []> {
  return jest.fn(() => value);
}

export function mockSequentialIdentifier(prefix: string): jest.Mock<string, []> {
  let sequence = 0;
  return jest.fn(() => `${prefix}${++sequence}`);
}
