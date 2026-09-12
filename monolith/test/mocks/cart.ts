export function mockCartRepo(
  overrides: {
    findOne?: unknown;
    create?: jest.Mock;
    save?: unknown;
  } = {},
) {
  return {
    findOne: jest.fn().mockResolvedValue('findOne' in overrides ? overrides.findOne : undefined),
    create: overrides.create ?? jest.fn().mockImplementation((value) => value),
    save: jest.fn().mockResolvedValue('save' in overrides ? overrides.save : undefined),
  };
}
