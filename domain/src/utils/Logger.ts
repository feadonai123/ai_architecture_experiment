export class Logger {
  static info(message: string, extra?: unknown): void {
    if (extra === undefined) {
      console.info(`[INFO] ${message}`);
      return;
    }
    console.info(`[INFO] ${message}`, extra);
  }

  static warn(message: string, extra?: unknown): void {
    if (extra === undefined) {
      console.warn(`[WARN] ${message}`);
      return;
    }
    console.warn(`[WARN] ${message}`, extra);
  }

  static error(message: string, extra?: unknown): void {
    if (extra === undefined) {
      console.error(`[ERROR] ${message}`);
      return;
    }
    console.error(`[ERROR] ${message}`, extra);
  }
}
