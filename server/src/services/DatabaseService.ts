import sql from 'mssql';

export class DatabaseService {
  private static instance: DatabaseService;
  private pool: sql.ConnectionPool | null = null;
  private config: sql.config;

  private constructor() {
    this.config = {
      server: process.env.DB_SERVER || 'SergeyM\\SQLEXPRESS',
      database: process.env.DB_DATABASE || 'startUp1',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        trustedConnection: true,
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
      this.pool = await sql.connect(this.config);
      console.log('✅ Connected to SQL Server successfully');
    } catch (error) {
      console.error('❌ Failed to connect to SQL Server:', error);
      throw error;
    }
  }

  public async query<T = any>(queryText: string, params?: Record<string, any>): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
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

  public async execute(queryText: string, params?: Record<string, any>): Promise<sql.IResult<any>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
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