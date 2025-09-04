import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CronJob } from '../entities/cronjob.entity';
import { ExecutionLog } from '../entities/execution-log.entity';
import { Tag } from '../entities/tag.entity';
import * as path from 'path';

@Injectable()
export class DatabaseConfigService {
  private readonly dbType: string;
  
  constructor() {
    this.dbType = process.env.DB_TYPE?.toLowerCase() || 'sqlite';
    console.log('Database type:', this.dbType);
    console.log('Environment:', process.env.NODE_ENV || 'development');
  }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const commonOptions: Partial<TypeOrmModuleOptions> = {
      entities: [CronJob, ExecutionLog, Tag],
      synchronize: process.env.NODE_ENV !== 'production' || process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.NODE_ENV === 'development' || process.env.DB_LOGGING === 'true',
      autoLoadEntities: true,
    };

    switch (this.dbType) {
      case 'mysql':
        const mysqlConfig = {
          ...commonOptions,
          type: 'mysql' as const,
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306', 10),
          username: process.env.DB_USERNAME || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_DATABASE || 'crontab_gui',
          charset: process.env.DB_CHARSET || 'utf8mb4',
          timezone: process.env.DB_TIMEZONE || 'Z',
          connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '60000', 10),
          acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000', 10),
          insecureAuth: process.env.DB_INSECURE_AUTH === 'true',
          extra: {
            connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
            queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),
            waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false',
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
          },
        };
        console.log('MySQL configuration:', {
          host: mysqlConfig.host,
          port: mysqlConfig.port,
          database: mysqlConfig.database,
          username: mysqlConfig.username,
        });
        return mysqlConfig as TypeOrmModuleOptions;

      case 'sqlite':
      default:
        const sqlitePath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.sqlite');
        console.log('SQLite database path:', sqlitePath);
        return {
          ...commonOptions,
          type: 'sqlite',
          database: sqlitePath,
        } as TypeOrmModuleOptions;
    }
  }

  getDatabaseType(): string {
    return this.dbType;
  }

  isMySQL(): boolean {
    return this.dbType === 'mysql';
  }

  isSQLite(): boolean {
    return this.dbType === 'sqlite';
  }

  getConnectionInfo(): Record<string, any> {
    if (this.isMySQL()) {
      return {
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        database: process.env.DB_DATABASE || 'crontab_gui',
        username: process.env.DB_USERNAME || 'root',
      };
    }
    return {
      type: 'sqlite',
      database: process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.sqlite'),
    };
  }
}