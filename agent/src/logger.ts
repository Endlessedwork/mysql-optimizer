export class Logger {
  private timestamp(): string {
    return new Date().toISOString();
  }

  private sanitize(data: any): string {
    if (!data) return '';
    if (data instanceof Error) {
      return JSON.stringify({ message: data.message, name: data.name });
    }
    try {
      return JSON.stringify(data);
    } catch {
      return '[unserializable]';
    }
  }

  info(message: string, data?: any) {
    console.log(`[${this.timestamp()}] INFO: ${message}`, data ? this.sanitize(data) : '');
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.timestamp()}] WARN: ${message}`, data ? this.sanitize(data) : '');
  }

  error(message: string, error?: any) {
    console.error(`[${this.timestamp()}] ERROR: ${message}`, error ? this.sanitize(error) : '');
  }

  debug(message: string, data?: any) {
    if (process.env.DEBUG === 'true') {
      console.log(`[${this.timestamp()}] DEBUG: ${message}`, data ? this.sanitize(data) : '');
    }
  }
}
