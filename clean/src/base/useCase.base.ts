import { Logger } from '../utils/Logger';

export abstract class UseCase<TArgs extends unknown[], TOutput> {
  async run(...args: TArgs): Promise<TOutput> {
    Logger.info(`${this.constructor.name} start`);
    try {
      return await this.execute(...args);
    } catch (error) {
      Logger.error(`${this.constructor.name} error`, error);
      throw error;
    } finally {
      Logger.info(`${this.constructor.name} finish`);
    }
  }

  protected abstract execute(...args: TArgs): Promise<TOutput>;
}
