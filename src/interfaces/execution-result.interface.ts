export interface ExecutionResult {
  status: 'success' | 'failure';
  responseCode?: number;
  responseTime: number;
  responseBody?: string;
  errorMessage?: string;
  retryCount?: number;
}