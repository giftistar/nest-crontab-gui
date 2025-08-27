import { ApiProperty } from '@nestjs/swagger';
import { ExecutionLog } from '../entities/execution-log.entity';

export class PaginatedLogResponseDto {
  @ApiProperty({
    description: 'Array of execution log entries',
    type: [ExecutionLog],
  })
  logs: ExecutionLog[];

  @ApiProperty({
    description: 'Total number of logs matching the query',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevious: boolean;
}

export class LogStatisticsDto {
  @ApiProperty({
    description: 'Total number of executions',
    example: 500,
  })
  totalExecutions: number;

  @ApiProperty({
    description: 'Number of successful executions',
    example: 480,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed executions',
    example: 20,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 96.0,
  })
  successRate: number;

  @ApiProperty({
    description: 'Average response time in milliseconds',
    example: 523.45,
  })
  averageResponseTime: number;

  @ApiProperty({
    description: 'Minimum response time in milliseconds',
    example: 120,
  })
  minResponseTime: number;

  @ApiProperty({
    description: 'Maximum response time in milliseconds',
    example: 5230,
  })
  maxResponseTime: number;

  @ApiProperty({
    description: 'Statistics grouped by job',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        jobId: { type: 'string', format: 'uuid' },
        jobName: { type: 'string' },
        totalExecutions: { type: 'number' },
        successCount: { type: 'number' },
        failureCount: { type: 'number' },
        averageResponseTime: { type: 'number' },
      },
    },
  })
  jobStatistics: Array<{
    jobId: string;
    jobName: string;
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    averageResponseTime: number;
  }>;
}