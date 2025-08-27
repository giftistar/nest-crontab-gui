import {
  Controller,
  Post,
  Param,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CronJobService } from '../services/cronjob.service';
import { SchedulerService } from '../services/scheduler.service';
import { ExecutionResult } from '../interfaces/execution-result.interface';

// Simple in-memory rate limiter
interface RateLimitEntry {
  lastExecutionTime: number;
  count: number;
}

@ApiTags('Execution')
@Controller('api/jobs')
export class JobExecutionController {
  private readonly logger = new Logger(JobExecutionController.name);
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly RATE_LIMIT_WINDOW = 10000; // 10 seconds
  private readonly MAX_EXECUTIONS_PER_WINDOW = 1;

  constructor(
    private readonly cronJobService: CronJobService,
    private readonly schedulerService: SchedulerService,
  ) {}

  @Post(':id/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger a cron job',
    description: 'Execute a cron job immediately, bypassing its schedule. Rate limited to 1 execution per 10 seconds per job.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID of the cron job to trigger',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job executed successfully',
    schema: {
      example: {
        jobId: '123e4567-e89b-12d3-a456-426614174000',
        jobName: 'Health Check API',
        executionResult: {
          status: 'success',
          responseCode: 200,
          responseTime: 523,
          responseBody: '{"status":"ok"}',
        },
        triggeredAt: '2025-08-27T10:30:00.000Z',
        message: 'Job executed successfully',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Job with ID "123e4567-e89b-12d3-a456-426614174000" not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Job is not active or validation failed',
    schema: {
      example: {
        statusCode: 400,
        message: 'Job is not active',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
    schema: {
      example: {
        statusCode: 429,
        message: 'Rate limit exceeded. Please wait 10 seconds before triggering this job again.',
        error: 'Too Many Requests',
        retryAfter: 7.5,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Job execution failed',
    schema: {
      example: {
        statusCode: 500,
        message: 'Failed to execute job',
        error: 'Internal Server Error',
        details: 'Connection timeout',
      },
    },
  })
  async triggerJob(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{
    jobId: string;
    jobName: string;
    executionResult: ExecutionResult | null;
    triggeredAt: Date;
    message: string;
  }> {
    const startTime = Date.now();
    this.logger.log(`Manual trigger requested for job ${id}`);

    // Check rate limit
    this.checkRateLimit(id);

    // Validate job exists
    let job;
    try {
      job = await this.cronJobService.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Job with ID "${id}" not found`);
    }

    // Check if job is active
    if (!job.isActive) {
      throw new BadRequestException('Job is not active. Please activate the job before triggering manually.');
    }

    // Check if job is already running
    if (this.schedulerService.isJobRunning(id)) {
      throw new BadRequestException('Job is already running. Please wait for the current execution to complete.');
    }

    // Execute job
    let executionResult: ExecutionResult | null = null;
    try {
      // Use scheduler service to execute manually (this will log with triggeredManually flag)
      await this.schedulerService.executeJobManually(id);

      // Get job status for additional info
      const jobStatus = this.schedulerService.getJobStatus(id);

      this.logger.log(`Job "${job.name}" triggered manually and executed successfully`);

      return {
        jobId: job.id,
        jobName: job.name,
        executionResult: {
          status: 'success',
          responseTime: Date.now() - startTime,
        } as ExecutionResult,
        triggeredAt: new Date(),
        message: 'Job executed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to execute job "${job.name}" manually: ${error.message}`);
      
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to execute job',
          error: 'Internal Server Error',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute a cron job (alias for trigger)',
    description: 'Alternative endpoint to manually execute a cron job immediately',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID of the cron job to execute',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job executed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Job is not active',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async executeJob(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.triggerJob(id);
  }

  private checkRateLimit(jobId: string): void {
    const now = Date.now();
    const rateLimitEntry = this.rateLimitMap.get(jobId);

    if (rateLimitEntry) {
      const timeSinceLastExecution = now - rateLimitEntry.lastExecutionTime;

      if (timeSinceLastExecution < this.RATE_LIMIT_WINDOW) {
        const waitTime = (this.RATE_LIMIT_WINDOW - timeSinceLastExecution) / 1000;
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Rate limit exceeded. Please wait ${waitTime.toFixed(1)} seconds before triggering this job again.`,
            error: 'Too Many Requests',
            retryAfter: waitTime,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Reset if outside window
      rateLimitEntry.lastExecutionTime = now;
      rateLimitEntry.count = 1;
    } else {
      // First execution
      this.rateLimitMap.set(jobId, {
        lastExecutionTime: now,
        count: 1,
      });
    }

    // Clean up old entries periodically (simple cleanup)
    if (this.rateLimitMap.size > 100) {
      const cutoffTime = now - this.RATE_LIMIT_WINDOW * 2;
      for (const [key, entry] of this.rateLimitMap.entries()) {
        if (entry.lastExecutionTime < cutoffTime) {
          this.rateLimitMap.delete(key);
        }
      }
    }
  }
}