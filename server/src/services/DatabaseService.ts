import sql from 'mssql';

export class DatabaseService {
  private static instance: DatabaseService;
  private pool: sql.ConnectionPool | null = null;
  private config: sql.config;

  private constructor() {
    // Check if we should use trusted connection or SQL Server auth
    const trustedConnection = process.env.DB_TRUSTED_CONNECTION === 'true';
    
    this.config = {
      server: process.env.DB_SERVER || 'localhost',
      port: parseInt(process.env.DB_PORT || '61299'),
      database: process.env.DB_DATABASE || 'startUp1',
      user: process.env.DB_USER || 'mishin_learn_user',
      password: process.env.DB_PASSWORD || 'MishinLearn2024!',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectionTimeout: 60000,
        requestTimeout: 60000,
        useUTC: true, // CRITICAL: Treat all DATETIME2 as UTC (database uses GETUTCDATE())
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      console.log('🔄 Connecting to SQL Server...');
      this.pool = new sql.ConnectionPool(this.config);
      await this.pool.connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to SQL Server:', error);
      this.pool = null;
      throw error; // Throw error to indicate initialization failure
    }
  }

  public async ensureConnection(): Promise<void> {
    if (!this.pool || !this.pool.connected) {
      console.log('🔄 Reconnecting to database...');
      await this.initialize();
    }
  }

  public async healthCheck(): Promise<{ isConnected: boolean; error?: string }> {
    try {
      if (!this.pool) {
        return { isConnected: false, error: 'No connection pool' };
      }
      
      await this.pool.request().query('SELECT 1 as health');
      return { isConnected: true };
    } catch (error) {
      return { isConnected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  public async query<T = any>(queryText: string, params?: Record<string, any>): Promise<T[]> {
    try {
      await this.ensureConnection();
      
      if (!this.pool) {
        throw new Error('Database not connected. Please check database configuration.');
      }

      const request = this.pool.request();
      
      // Add parameters if provided
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
      }

      const result = await request.query(queryText);
      return result.recordset;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  public async getRequest(): Promise<sql.Request> {
    await this.ensureConnection();
    
    if (!this.pool) {
      throw new Error('Database not connected. Please check database configuration.');
    }

    return this.pool.request();
  }

  public async execute(queryText: string, params?: Record<string, any>): Promise<sql.IResult<any>> {
    if (!this.pool) {
      throw new Error('Database not connected. Please check database configuration.');
    }

    try {
      const request = this.pool.request();
      
      // Add parameters if provided
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
      }

      return await request.query(queryText);
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}