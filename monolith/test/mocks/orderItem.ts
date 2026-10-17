export function mockOrderItemRepo(overrides: { create?: jest.Mock; save?: unknown } = {}) {
  return {
    create: overrides.create ?? jest.fn().mockImplementation((value) => value),
    save: jest
      .fn()
      .mockImplementation((items) => Promise.resolve('save' in overrides ? overrides.save : items)),
  };
}
