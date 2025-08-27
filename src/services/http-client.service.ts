import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { firstValueFrom, catchError, of } from 'rxjs';
import { CronJob } from '../entities/cronjob.entity';
import { ExecutionLog, ExecutionStatus } from '../entities/execution-log.entity';
import { ExecutionResult } from '../interfaces/execution-result.interface';

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private readonly MAX_RESPONSE_SIZE = 10 * 1024; // 10KB
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000; // Base delay for exponential backoff

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(ExecutionLog)
    private readonly executionLogRepository: Repository<ExecutionLog>,
  ) {}

  async executeRequest(job: CronJob, triggeredManually: boolean = false): Promise<ExecutionResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;
    
    while (retryCount < this.MAX_RETRIES) {
      try {
        const result = await this.performRequest(job, startTime);
        
        // Save to database
        await this.saveExecutionLog(job, result, startTime, triggeredManually);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if the error is retryable
        if (!this.isRetryableError(error)) {
          const errorResult = this.createErrorResult(error, startTime, retryCount);
          await this.saveExecutionLog(job, errorResult, startTime, triggeredManually);
          return errorResult;
        }
        
        retryCount++;
        
        if (retryCount < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
          this.logger.warn(
            `Retrying request for job ${job.name} (attempt ${retryCount}/${this.MAX_RETRIES}) after ${delay}ms`,
          );
          await this.sleep(delay);
        }
      }
    }
    
    // All retries exhausted
    const finalResult = this.createErrorResult(
      lastError || new Error('Unknown error'),
      startTime,
      retryCount,
    );
    await this.saveExecutionLog(job, finalResult, startTime, triggeredManually);
    return finalResult;
  }

  private async performRequest(job: CronJob, startTime: number): Promise<ExecutionResult> {
    // Parse headers
    let headers: Record<string, string> = {};
    if (job.headers) {
      try {
        headers = JSON.parse(job.headers);
      } catch (error) {
        this.logger.error(`Failed to parse headers for job ${job.name}: ${error}`);
      }
    }
    
    // Parse body for POST requests
    let data: any = undefined;
    if (job.method === 'POST' && job.body) {
      try {
        data = JSON.parse(job.body);
      } catch (error) {
        // If JSON parsing fails, send as plain text
        data = job.body;
      }
    }
    
    // Configure request
    // Use per-job timeout if available, otherwise use default
    const timeout = job.requestTimeout || this.REQUEST_TIMEOUT;
    
    const config: AxiosRequestConfig = {
      method: job.method,
      url: job.url,
      headers,
      data,
      timeout,
      maxContentLength: this.MAX_RESPONSE_SIZE,
      maxBodyLength: this.MAX_RESPONSE_SIZE,
      validateStatus: () => true, // Accept any status code
    };
    
    this.logger.log(`Executing ${job.method} request to ${job.url}`);
    
    // Execute request
    const response = await firstValueFrom(
      this.httpService.request(config).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );
    
    const responseTime = Date.now() - startTime;
    
    // Process response
    const responseBody = this.processResponseBody(response);
    
    return {
      status: 'success',
      responseCode: response.status,
      responseTime,
      responseBody,
    };
  }

  private processResponseBody(response: AxiosResponse): string {
    let body: string;
    
    try {
      const contentType = response.headers['content-type'] || '';
      
      if (contentType.includes('application/json')) {
        body = JSON.stringify(response.data);
      } else if (typeof response.data === 'object') {
        body = JSON.stringify(response.data);
      } else {
        body = String(response.data);
      }
      
      // Limit response size
      if (body.length > this.MAX_RESPONSE_SIZE) {
        body = body.substring(0, this.MAX_RESPONSE_SIZE) + '... [truncated]';
      }
    } catch (error) {
      this.logger.error(`Error processing response body: ${error}`);
      body = '[Error processing response]';
    }
    
    return body;
  }

  private isRetryableError(error: any): boolean {
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET') {
      return true;
    }
    
    if (error.response) {
      // Retry on 5xx server errors or 429 (Too Many Requests)
      const status = error.response.status;
      return status >= 500 || status === 429;
    }
    
    return false;
  }

  private createErrorResult(
    error: any,
    startTime: number,
    retryCount: number,
  ): ExecutionResult {
    const responseTime = Date.now() - startTime;
    let errorMessage = 'Unknown error';
    let responseCode: number | undefined;
    
    if (error.response) {
      // HTTP error response
      responseCode = error.response.status;
      errorMessage = `HTTP ${responseCode}: ${error.response.statusText || 'Unknown error'}`;
      
      if (error.response.data) {
        try {
          const errorData = typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data);
          errorMessage += ` - ${errorData}`;
        } catch {
          // Ignore JSON stringify errors
        }
      }
    } else if (error.code) {
      // Network error
      errorMessage = `Network error: ${error.code}`;
      if (error.message) {
        errorMessage += ` - ${error.message}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      status: 'failure',
      responseCode,
      responseTime,
      errorMessage,
      retryCount: retryCount > 0 ? retryCount : undefined,
    };
  }

  private async saveExecutionLog(
    job: CronJob,
    result: ExecutionResult,
    startTime: number,
    triggeredManually: boolean = false,
  ): Promise<void> {
    try {
      const executionLog = this.executionLogRepository.create({
        job,
        executedAt: new Date(startTime),
        status: result.status === 'success' ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED,
        responseCode: result.responseCode,
        responseBody: result.responseBody,
        errorMessage: result.errorMessage,
        executionTime: result.responseTime,
        triggeredManually,
      });
      
      await this.executionLogRepository.save(executionLog);
      this.logger.log(`Saved execution log for job ${job.name}`);
    } catch (error) {
      this.logger.error(`Failed to save execution log: ${error}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}