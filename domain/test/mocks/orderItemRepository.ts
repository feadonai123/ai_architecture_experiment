export function mockOrderItemRepository() {
  return {
    create: jest.fn().mockResolvedValue(undefined),
  };
}
