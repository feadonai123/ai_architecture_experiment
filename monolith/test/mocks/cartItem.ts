export function mockCartItemRepo(
  overrides: {
    findOne?: unknown;
    find?: unknown;
    create?: jest.Mock;
    save?: unknown;
    remove?: unknown;
  } = {},
) {
  return {
    findOne: jest.fn().mockResolvedValue('findOne' in overrides ? overrides.findOne : null),
    find: jest.fn().mockResolvedValue('find' in overrides ? overrides.find : []),
    create: overrides.create ?? jest.fn().mockImplementation((value) => value),
    save: jest.fn().mockResolvedValue('save' in overrides ? overrides.save : undefined),
    remove: jest.fn().mockResolvedValue('remove' in overrides ? overrides.remove : undefined),
  };
}
