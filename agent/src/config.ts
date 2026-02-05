export class Config {
  // Database connection settings
  public readonly host: string;
  public readonly port: number;
  public readonly user: string;
  public readonly password: string;
  public readonly database: string;
  
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
    this.host = process.env.DB_HOST || 'localhost';
    this.port = parseInt(process.env.DB_PORT || '3306', 10);
    this.user = process.env.DB_USER || 'optimizer';
    this.password = process.env.DB_PASSWORD || '';
    this.database = process.env.DB_DATABASE || '';
    
    this.maxExecutionTime = parseInt(process.env.MAX_EXECUTION_TIME || '5000', 10);
    this.throttleDelay = parseInt(process.env.THROTTLE_DELAY || '100', 10);
    this.topNQueries = parseInt(process.env.TOP_N_QUERIES || '100', 10);

    // Safety: read-only commands only. DDL uses separate executeDDL() method.
    this.allowedCommands = ['SELECT', 'SHOW', 'EXPLAIN'];
    
    this.apiUrl = process.env.API_URL || 'https://api.mysql-optimizer.com';
    this.apiKey = process.env.API_KEY || '';
  }
}