export class Logger {
  private timestamp(): string {
    return new Date().toISOString();
  }

  info(message: string, data?: any) {
    console.log(`[${this.timestamp()}] INFO: ${message}`, data ? JSON.stringify(data) : '');
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.timestamp()}] WARN: ${message}`, data ? JSON.stringify(data) : '');
  }

  error(message: string, error?: any) {
    console.error(`[${this.timestamp()}] ERROR: ${message}`, error ? JSON.stringify(error) : '');
  }
}