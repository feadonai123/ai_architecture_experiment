import { User as UserEntity } from '../../src/entities/User';
import { User } from '../../src/models/User';

export function mockUserFindById(value: UserEntity | null) {
  return jest.spyOn(User, 'findById').mockResolvedValue(value);
}
