export function mockOrderItemRepo(
  overrides: { create?: jest.Mock; save?: unknown; find?: unknown } = {},
) {
  return {
    find: jest.fn().mockResolvedValue(overrides.find ?? []),
    create: overrides.create ?? jest.fn().mockImplementation((value) => value),
    save: jest
      .fn()
      .mockImplementation((items) => Promise.resolve('save' in overrides ? overrides.save : items)),
  };
}
