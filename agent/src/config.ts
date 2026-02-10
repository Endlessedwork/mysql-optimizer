export class Config {
  // Database connection settings - mutable for dynamic connections
  public mysqlHost: string;
  public mysqlPort: number;
  public mysqlUser: string;
  public mysqlPassword: string;
  public mysqlDatabase: string;

  // Legacy aliases for backward compatibility
  public get host(): string { return this.mysqlHost; }
  public get port(): number { return this.mysqlPort; }
  public get user(): string { return this.mysqlUser; }
  public get password(): string { return this.mysqlPassword; }
  public get database(): string { return this.mysqlDatabase; }

  // Agent settings
  public readonly maxExecutionTime: number;
  public readonly throttleDelay: number;
  public readonly topNQueries: number;

  // Safety settings
  public readonly allowedCommands: readonly string[];

  // SaaS API settings
  public readonly apiUrl: string;
  public readonly apiKey: string;

  constructor() {
    this.mysqlHost = process.env.DB_HOST || 'localhost';
    this.mysqlPort = parseInt(process.env.DB_PORT || '3306', 10);
    this.mysqlUser = process.env.DB_USER || 'optimizer';
    this.mysqlPassword = process.env.DB_PASSWORD || '';
    this.mysqlDatabase = process.env.DB_DATABASE || '';

    this.maxExecutionTime = parseInt(process.env.MAX_EXECUTION_TIME || '5000', 10);
    this.throttleDelay = parseInt(process.env.THROTTLE_DELAY || '100', 10);
    this.topNQueries = parseInt(process.env.TOP_N_QUERIES || '100', 10);

    // Safety: read-only commands only. DDL uses separate executeDDL() method.
    this.allowedCommands = ['SELECT', 'SHOW', 'EXPLAIN'];

    this.apiUrl = process.env.API_URL || 'http://saas-api:3001';
    this.apiKey = process.env.API_KEY || '';
  }
}
