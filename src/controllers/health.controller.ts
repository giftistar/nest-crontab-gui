import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronJob } from '../entities/cronjob.entity';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  database: {
    status: 'connected' | 'disconnected';
    totalJobs?: number;
    activeJobs?: number;
  };
  system: {
    platform: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      dataPath: string;
      available: boolean;
      writable?: boolean;
    };
  };
  version: {
    node: string;
    app: string;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectRepository(CronJob)
    private readonly cronJobRepository: Repository<CronJob>,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Health check endpoint',
    description: 'Returns application health status including database connectivity and system metrics'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-08-27T10:00:00.000Z',
        uptime: 3600,
        environment: 'production',
        database: {
          status: 'connected',
          totalJobs: 10,
          activeJobs: 5
        },
        system: {
          platform: 'linux',
          memory: {
            used: 256,
            total: 512,
            percentage: 50
          },
          disk: {
            dataPath: '/app/data',
            available: true,
            writable: true
          }
        },
        version: {
          node: '18.0.0',
          app: '1.0.0'
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.SERVICE_UNAVAILABLE, 
    description: 'Application is unhealthy' 
  })
  async checkHealth(@Res() res: Response): Promise<Response> {
    const healthStatus: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'disconnected'
      },
      system: {
        platform: os.platform(),
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        },
        disk: {
          dataPath: process.env.DB_PATH || './data',
          available: false
        }
      },
      version: {
        node: process.version,
        app: process.env.npm_package_version || '1.0.0'
      }
    };

    try {
      // Check database connectivity
      const [totalJobs, activeJobs] = await Promise.all([
        this.cronJobRepository.count(),
        this.cronJobRepository.count({ where: { isActive: true } })
      ]);

      healthStatus.database = {
        status: 'connected',
        totalJobs,
        activeJobs
      };
    } catch (error) {
      healthStatus.status = 'error';
      healthStatus.database.status = 'disconnected';
    }

    // Check system memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    healthStatus.system.memory = {
      used: Math.round(usedMem / (1024 * 1024)), // MB
      total: Math.round(totalMem / (1024 * 1024)), // MB
      percentage: Math.round((usedMem / totalMem) * 100)
    };

    // Check disk availability
    const dataPath = path.resolve(process.env.DB_PATH || './data');
    try {
      // Check if data directory exists
      await fs.promises.access(dataPath, fs.constants.F_OK);
      healthStatus.system.disk.available = true;
      
      // Check if writable
      await fs.promises.access(dataPath, fs.constants.W_OK);
      healthStatus.system.disk.writable = true;
    } catch (error) {
      healthStatus.system.disk.available = false;
      healthStatus.system.disk.writable = false;
      
      // Try to create the directory if it doesn't exist
      try {
        await fs.promises.mkdir(dataPath, { recursive: true });
        healthStatus.system.disk.available = true;
        healthStatus.system.disk.writable = true;
      } catch (createError) {
        healthStatus.status = 'error';
      }
    }

    const statusCode = healthStatus.status === 'ok' 
      ? HttpStatus.OK 
      : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json(healthStatus);
  }

  @Get('live')
  @ApiOperation({ 
    summary: 'Liveness probe',
    description: 'Simple endpoint to check if the application is running'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Application is alive' 
  })
  liveness(@Res() res: Response): Response {
    return res.status(HttpStatus.OK).json({ status: 'alive' });
  }

  @Get('ready')
  @ApiOperation({ 
    summary: 'Readiness probe',
    description: 'Check if the application is ready to accept requests'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Application is ready' 
  })
  @ApiResponse({ 
    status: HttpStatus.SERVICE_UNAVAILABLE, 
    description: 'Application is not ready' 
  })
  async readiness(@Res() res: Response): Promise<Response> {
    try {
      // Quick database check
      await this.cronJobRepository.query('SELECT 1');
      return res.status(HttpStatus.OK).json({ status: 'ready' });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ 
        status: 'not ready',
        reason: 'Database connection failed'
      });
    }
  }
}