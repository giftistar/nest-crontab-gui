import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, ILike } from 'typeorm';
import { ExecutionLog, ExecutionStatus } from '../entities/execution-log.entity';
import { CronJob } from '../entities/cronjob.entity';
import { LogQueryDto, LogSearchDto } from '../dto/log-query.dto';
import { PaginatedLogResponseDto, LogStatisticsDto } from '../dto/log-response.dto';

@ApiTags('Logs')
@Controller('api')
export class LogsController {
  constructor(
    @InjectRepository(ExecutionLog)
    private readonly executionLogRepository: Repository<ExecutionLog>,
    @InjectRepository(CronJob)
    private readonly cronJobRepository: Repository<CronJob>,
  ) {}

  @Get('jobs/:id/logs')
  @ApiOperation({
    summary: 'Get execution logs for a specific job',
    description: 'Retrieve paginated execution logs for a specific cron job with filtering options',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID of the cron job',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of execution logs',
    type: PaginatedLogResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  async getJobLogs(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: LogQueryDto,
  ): Promise<PaginatedLogResponseDto> {
    // Verify job exists
    const job = await this.cronJobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with ID "${id}" not found`);
    }

    // Build query conditions
    const where: any = { job: { id } };

    if (query.status) {
      where.status = query.status;
    }

    if (query.triggeredManually !== undefined) {
      where.triggeredManually = query.triggeredManually;
    }

    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      
      if (startDate > endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
      
      where.executedAt = Between(startDate, endDate);
    } else if (query.startDate) {
      where.executedAt = Between(new Date(query.startDate), new Date());
    } else if (query.endDate) {
      where.executedAt = Between(new Date(0), new Date(query.endDate));
    }

    // Calculate pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Execute query
    const [logs, total] = await this.executionLogRepository.findAndCount({
      where,
      relations: ['job'],
      order: { executedAt: 'DESC' },
      take: limit,
      skip,
    });

    // Truncate response bodies if not expanded
    if (!query.expand) {
      logs.forEach(log => {
        if (log.responseBody && log.responseBody.length > 500) {
          log.responseBody = log.responseBody.substring(0, 500) + '...';
        }
      });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  @Get('logs/search')
  @ApiOperation({
    summary: 'Search execution logs',
    description: 'Search execution logs across all jobs with various filters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of matching execution logs',
    type: PaginatedLogResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  async searchLogs(
    @Query() query: LogSearchDto,
  ): Promise<PaginatedLogResponseDto> {
    // Build query conditions
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.triggeredManually !== undefined) {
      where.triggeredManually = query.triggeredManually;
    }

    if (query.jobName) {
      where.job = { name: ILike(`%${query.jobName}%`) };
    }

    if (query.responseContent) {
      where.responseBody = ILike(`%${query.responseContent}%`);
    }

    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      
      if (startDate > endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
      
      where.executedAt = Between(startDate, endDate);
    } else if (query.startDate) {
      where.executedAt = Between(new Date(query.startDate), new Date());
    } else if (query.endDate) {
      where.executedAt = Between(new Date(0), new Date(query.endDate));
    }

    // Calculate pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Execute query
    const [logs, total] = await this.executionLogRepository.findAndCount({
      where,
      relations: ['job'],
      order: { executedAt: 'DESC' },
      take: limit,
      skip,
    });

    // Truncate response bodies if not expanded
    if (!query.expand) {
      logs.forEach(log => {
        if (log.responseBody && log.responseBody.length > 500) {
          log.responseBody = log.responseBody.substring(0, 500) + '...';
        }
      });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  @Get('logs/stats')
  @ApiOperation({
    summary: 'Get execution statistics',
    description: 'Get aggregated statistics for all execution logs',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter statistics from this date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter statistics until this date (ISO 8601)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Execution statistics',
    type: LogStatisticsDto,
  })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<LogStatisticsDto> {
    const queryBuilder = this.executionLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.job', 'job');

    // Apply date filters
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        throw new BadRequestException('Start date must be before end date');
      }
      
      queryBuilder.where('log.executedAt BETWEEN :start AND :end', { start, end });
    } else if (startDate) {
      queryBuilder.where('log.executedAt >= :start', { start: new Date(startDate) });
    } else if (endDate) {
      queryBuilder.where('log.executedAt <= :end', { end: new Date(endDate) });
    }

    // Get overall statistics
    const overallStats = await queryBuilder
      .select('COUNT(*)', 'totalExecutions')
      .addSelect('SUM(CASE WHEN log.status = :success THEN 1 ELSE 0 END)', 'successCount')
      .addSelect('SUM(CASE WHEN log.status = :failed THEN 1 ELSE 0 END)', 'failureCount')
      .addSelect('AVG(log.executionTime)', 'averageResponseTime')
      .addSelect('MIN(log.executionTime)', 'minResponseTime')
      .addSelect('MAX(log.executionTime)', 'maxResponseTime')
      .setParameter('success', ExecutionStatus.SUCCESS)
      .setParameter('failed', ExecutionStatus.FAILED)
      .getRawOne();

    // Get per-job statistics
    const jobStatsQuery = this.executionLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.job', 'job')
      .select('job.id', 'jobId')
      .addSelect('job.name', 'jobName')
      .addSelect('COUNT(*)', 'totalExecutions')
      .addSelect('SUM(CASE WHEN log.status = :success THEN 1 ELSE 0 END)', 'successCount')
      .addSelect('SUM(CASE WHEN log.status = :failed THEN 1 ELSE 0 END)', 'failureCount')
      .addSelect('AVG(log.executionTime)', 'averageResponseTime')
      .setParameter('success', ExecutionStatus.SUCCESS)
      .setParameter('failed', ExecutionStatus.FAILED)
      .groupBy('job.id')
      .addGroupBy('job.name');

    // Apply same date filters to job stats
    if (startDate && endDate) {
      jobStatsQuery.where('log.executedAt BETWEEN :start AND :end', { 
        start: new Date(startDate), 
        end: new Date(endDate) 
      });
    } else if (startDate) {
      jobStatsQuery.where('log.executedAt >= :start', { start: new Date(startDate) });
    } else if (endDate) {
      jobStatsQuery.where('log.executedAt <= :end', { end: new Date(endDate) });
    }

    const jobStats = await jobStatsQuery.getRawMany();

    // Calculate success rate
    const totalExecutions = Number(overallStats.totalExecutions) || 0;
    const successCount = Number(overallStats.successCount) || 0;
    const failureCount = Number(overallStats.failureCount) || 0;
    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;

    return {
      totalExecutions,
      successCount,
      failureCount,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(Number(overallStats.averageResponseTime) || 0),
      minResponseTime: Number(overallStats.minResponseTime) || 0,
      maxResponseTime: Number(overallStats.maxResponseTime) || 0,
      jobStatistics: jobStats.map(stat => ({
        jobId: stat.jobId,
        jobName: stat.jobName,
        totalExecutions: Number(stat.totalExecutions) || 0,
        successCount: Number(stat.successCount) || 0,
        failureCount: Number(stat.failureCount) || 0,
        averageResponseTime: Math.round(Number(stat.averageResponseTime) || 0),
      })),
    };
  }
}