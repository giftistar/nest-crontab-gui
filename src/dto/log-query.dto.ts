import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ExecutionStatus } from '../entities/execution-log.entity';

export class LogQueryDto {
  @ApiPropertyOptional({ 
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Filter by execution status',
    enum: ExecutionStatus,
    example: ExecutionStatus.SUCCESS,
  })
  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @ApiPropertyOptional({ 
    description: 'Filter logs from this date (ISO 8601)',
    example: '2025-08-25T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: 'Filter logs until this date (ISO 8601)',
    example: '2025-08-27T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ 
    description: 'Expand response body (default: truncated to 500 chars)',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  expand?: boolean = false;

  @ApiPropertyOptional({
    description: 'Filter by manual trigger status',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  triggeredManually?: boolean;
}

export class LogSearchDto extends LogQueryDto {
  @ApiPropertyOptional({
    description: 'Search by job name (partial match)',
    example: 'health check',
  })
  @IsOptional()
  @IsString()
  jobName?: string;

  @ApiPropertyOptional({
    description: 'Search in response body content',
    example: 'error',
  })
  @IsOptional()
  @IsString()
  responseContent?: string;
}