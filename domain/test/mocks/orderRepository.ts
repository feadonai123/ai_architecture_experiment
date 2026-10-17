export function mockOrderRepository() {
  return {
    create: jest.fn().mockResolvedValue(undefined),
  };
}
