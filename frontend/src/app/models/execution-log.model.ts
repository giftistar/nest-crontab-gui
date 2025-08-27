export enum ExecutionStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
}

export interface ExecutionLog {
  id: string;
  jobId: string;
  job?: {
    id: string;
    name: string;
  };
  executedAt: string;
  status: ExecutionStatus;
  httpStatus?: number;
  responseCode?: number;
  responseBody?: string;
  responseHeaders?: string;
  errorMessage?: string;
  durationMs: number;
  executionTime: number;
  triggeredManually: boolean;
}

export interface PaginatedLogs {
  logs: ExecutionLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface LogStatistics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  jobStatistics: JobStatistic[];
}

export interface JobStatistic {
  jobId: string;
  jobName: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
}