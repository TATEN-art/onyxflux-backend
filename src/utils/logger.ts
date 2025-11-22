export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[${this.context}] INFO:`, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[${this.context}] ERROR:`, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.context}] WARN:`, message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] DEBUG:`, message, ...args);
    }
  }
}
