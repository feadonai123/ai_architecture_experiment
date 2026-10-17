export interface UserRepository {
  exists(id: string): Promise<boolean>;
}
