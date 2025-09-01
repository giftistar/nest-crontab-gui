export enum ScheduleType {
  CRON = 'cron',
  REPEAT = 'repeat',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
}

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  url: string;
  method: HttpMethod;
  headers?: string;
  body?: string;
  schedule: string;
  scheduleType: ScheduleType;
  isActive: boolean;
  requestTimeout?: number; // Timeout in milliseconds
  executionMode: ExecutionMode;
  maxConcurrent: number;
  currentRunning: number;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  executionCount: number;
}

export interface CreateCronJobDto {
  name: string;
  description?: string;
  url: string;
  method: HttpMethod;
  headers?: string;
  body?: string;
  schedule: string;
  scheduleType: ScheduleType;
  isActive?: boolean;
  requestTimeout?: number; // Timeout in milliseconds
  executionMode?: ExecutionMode;
  maxConcurrent?: number;
}

export interface UpdateCronJobDto extends Partial<CreateCronJobDto> {}