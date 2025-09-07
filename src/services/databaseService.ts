/**
 * Database Service
 * Handles database connections and operations for both Vercel KV and Postgres
 */

import { AnalyticsLog, AnalyticsEvent, UsageStats } from '../types';
import { eventToLogFormat, calculateUsageStats } from './analyticsService';

// Database configuration
interface DatabaseConfig {
  type: 'kv' | 'postgres';
  url?: string;
  kvUrl?: string;
  postgresUrl?: string;
}

// KV storage interface (for Vercel KV)
interface KVStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<void>;
  lpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  llen(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  del(key: string): Promise<number>;
}

// Postgres client interface
interface PostgresClient {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
  end(): Promise<void>;
}

/**
 * Database service class
 */
export class DatabaseService {
  private config: DatabaseConfig;
  private kvClient: KVStorage | null = null;
  private pgClient: PostgresClient | null = null;
  private isConnected = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      if (this.config.type === 'kv') {
        await this.connectKV();
      } else {
        await this.connectPostgres();
      }
      this.isConnected = true;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw new Error(`Failed to connect to ${this.config.type} database`);
    }
  }

  /**
   * Connect to Vercel KV
   */
  private async connectKV(): Promise<void> {
    if (!this.config.kvUrl) {
      throw new Error('KV_URL environment variable is required for KV storage');
    }

    // In a real implementation, this would use @vercel/kv
    // For now, we'll create a mock interface
    /* eslint-disable @typescript-eslint/no-unused-vars */
    this.kvClient = {
      async get(_key: string) {
        // Mock implementation - would use actual KV client
        return null;
      },
      async set(_key: string, _value: string, _options?: { ex?: number }) {
        // Mock implementation
      },
      async lpush(_key: string, ..._values: string[]) {
        // Mock implementation
        return _values.length;
      },
      async lrange(_key: string, _start: number, _stop: number) {
        // Mock implementation
        return [];
      },
      async llen(_key: string) {
        // Mock implementation
        return 0;
      },
      async exists(_key: string) {
        // Mock implementation
        return 0;
      },
      async del(_key: string) {
        // Mock implementation
        return 0;
      }
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
  }

  /**
   * Connect to Postgres
   */
  private async connectPostgres(): Promise<void> {
    if (!this.config.postgresUrl) {
      throw new Error('DATABASE_URL environment variable is required for Postgres');
    }

    // Mock Postgres client - in real implementation would use pg or @vercel/postgres
    /* eslint-disable @typescript-eslint/no-unused-vars */
    this.pgClient = {
      async query(_text: string, _params?: unknown[]) {
        // Mock implementation
        return { rows: [] };
      },
      async end() {
        // Mock implementation
      }
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
  }

  /**
   * Check if database is connected
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      if (this.config.type === 'kv' && this.kvClient) {
        await this.kvClient.exists('health_check');
        return true;
      } else if (this.config.type === 'postgres' && this.pgClient) {
        await this.pgClient.query('SELECT 1');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Store analytics event
   */
  async storeAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const log = eventToLogFormat(event);

    if (this.config.type === 'kv' && this.kvClient) {
      await this.storeEventInKV(log);
    } else if (this.config.type === 'postgres' && this.pgClient) {
      await this.storeEventInPostgres(log);
    }
  }

  /**
   * Store event in KV storage
   */
  private async storeEventInKV(log: AnalyticsLog): Promise<void> {
    if (!this.kvClient) throw new Error('KV client not initialized');

    const logData = JSON.stringify({
      ...log,
      timestamp: log.timestamp.toISOString()
    });

    // Store in a list for chronological access
    await this.kvClient.lpush('analytics_logs', logData);

    // Also store by topic for quick topic-based queries
    await this.kvClient.lpush(`topic:${log.topic}`, logData);

    // Store by date for time-based queries
    const dateKey = log.timestamp.toISOString().split('T')[0];
    await this.kvClient.lpush(`date:${dateKey}`, logData);
  }

  /**
   * Store event in Postgres
   */
  private async storeEventInPostgres(log: AnalyticsLog): Promise<void> {
    if (!this.pgClient) throw new Error('Postgres client not initialized');

    const query = `
      INSERT INTO question_logs 
      (session_id, timestamp, text_snippet, topic, language, line_clicked, routed)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.pgClient.query(query, [
      log.session_id,
      log.timestamp,
      log.text_snippet,
      log.topic,
      log.language,
      log.line_clicked,
      log.routed
    ]);
  }

  /**
   * Retrieve analytics logs
   */
  async getAnalyticsLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: {
      topic?: string;
      language?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<AnalyticsLog[]> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    if (this.config.type === 'kv' && this.kvClient) {
      return this.getLogsFromKV(limit, offset, filters);
    } else if (this.config.type === 'postgres' && this.pgClient) {
      return this.getLogsFromPostgres(limit, offset, filters);
    }

    return [];
  }

  /**
   * Get logs from KV storage
   */
  private async getLogsFromKV(
    limit: number,
    offset: number,
    filters?: Record<string, unknown>
  ): Promise<AnalyticsLog[]> {
    if (!this.kvClient) return [];

    let key = 'analytics_logs';
    
    // Use topic-specific key if filtering by topic
    if (filters?.topic) {
      key = `topic:${filters.topic}`;
    }

    const logStrings = await this.kvClient.lrange(key, offset, offset + limit - 1);
    
    return logStrings.map(logStr => {
      const parsed = JSON.parse(logStr);
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp)
      };
    }).filter(log => {
      // Apply additional filters
      if (filters?.language && log.language !== filters.language) return false;
      if (filters?.dateFrom && log.timestamp < filters.dateFrom) return false;
      if (filters?.dateTo && log.timestamp > filters.dateTo) return false;
      return true;
    });
  }

  /**
   * Get logs from Postgres
   */
  private async getLogsFromPostgres(
    limit: number,
    offset: number,
    filters?: Record<string, unknown>
  ): Promise<AnalyticsLog[]> {
    if (!this.pgClient) return [];

    let query = 'SELECT * FROM question_logs WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add filters
    if (filters?.topic) {
      query += ` AND topic = $${paramIndex}`;
      params.push(filters.topic);
      paramIndex++;
    }

    if (filters?.language) {
      query += ` AND language = $${paramIndex}`;
      params.push(filters.language);
      paramIndex++;
    }

    if (filters?.dateFrom) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters?.dateTo) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pgClient.query(query, params);
    return result.rows as AnalyticsLog[];
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<UsageStats> {
    const logs = await this.getAnalyticsLogs(1000, 0, { dateFrom, dateTo });
    return calculateUsageStats(logs);
  }

  /**
   * Get top questions by topic
   */
  async getTopQuestions(limit: number = 10): Promise<Array<{
    snippet: string;
    count: number;
    topic: string;
  }>> {
    const logs = await this.getAnalyticsLogs(1000);
    
    // Group by text snippet
    const snippetCounts: Record<string, { count: number; topic: string }> = {};
    
    logs.forEach(log => {
      if (!snippetCounts[log.text_snippet]) {
        snippetCounts[log.text_snippet] = { count: 0, topic: log.topic };
      }
      snippetCounts[log.text_snippet].count++;
    });

    return Object.entries(snippetCounts)
      .map(([snippet, data]) => ({
        snippet,
        count: data.count,
        topic: data.topic
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Initialize database schema (for Postgres)
   */
  async initializeSchema(): Promise<void> {
    if (this.config.type !== 'postgres' || !this.pgClient) {
      return; // KV doesn't need schema initialization
    }

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS question_logs (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        text_snippet VARCHAR(160) NOT NULL,
        topic VARCHAR(50) NOT NULL,
        language VARCHAR(2) NOT NULL,
        line_clicked BOOLEAN DEFAULT FALSE,
        routed VARCHAR(20) DEFAULT 'primary'
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON question_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_topic ON question_logs(topic);
      CREATE INDEX IF NOT EXISTS idx_session_id ON question_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_language ON question_logs(language);
    `;

    await this.pgClient.query(createTableQuery);
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.pgClient) {
      await this.pgClient.end();
      this.pgClient = null;
    }
    this.kvClient = null;
    this.isConnected = false;
  }
}

/**
 * Create database service instance based on environment
 */
export function createDatabaseService(): DatabaseService {
  // Check for Postgres first (recommended migration path)
  const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  // Legacy KV support (deprecated)
  const kvUrl = process.env.KV_URL;

  if (postgresUrl) {
    console.log('🐘 Using Postgres database (recommended)');
    return new DatabaseService({
      type: 'postgres',
      postgresUrl
    });
  } else if (kvUrl) {
    console.warn('⚠️  WARNING: Vercel KV is discontinued. Please migrate to Postgres.');
    console.warn('📖 See VERCEL_KV_MIGRATION_GUIDE.md for migration instructions.');
    return new DatabaseService({
      type: 'kv',
      kvUrl
    });
  } else {
    console.warn('🔧 No database configured. Using mock database for development.');
    console.warn('💡 For production, set DATABASE_URL to a Postgres connection string.');
    // Mock database for development
    return new DatabaseService({
      type: 'postgres',
      postgresUrl: 'mock://localhost'
    });
  }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

/**
 * Get database service singleton
 */
export async function getDatabase(): Promise<DatabaseService> {
  if (!dbInstance) {
    dbInstance = createDatabaseService();
    await dbInstance.connect();
  }
  return dbInstance;
}