import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { HttpClientService } from './http-client.service';
import { ExecutionLog } from '../entities/execution-log.entity';
import { CronJob, HttpMethod } from '../entities/cronjob.entity';

describe('HttpClientService', () => {
  let service: HttpClientService;
  let httpService: HttpService;
  let executionLogRepository: Repository<ExecutionLog>;

  const mockCronJob: CronJob = {
    id: 'test-id',
    name: 'Test Job',
    description: 'Test description',
    url: 'https://httpbin.org/get',
    method: HttpMethod.GET,
    scheduleType: 'cron',
    schedule: '0 * * * *',
    headers: '{"Authorization": "Bearer token"}',
    body: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastExecutedAt: null,
    executionCount: 0,
    executionLogs: [],
  };

  const mockAxiosResponse: AxiosResponse = {
    data: { message: 'success' },
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config: {} as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpClientService,
        {
          provide: HttpService,
          useValue: {
            request: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ExecutionLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HttpClientService>(HttpClientService);
    httpService = module.get<HttpService>(HttpService);
    executionLogRepository = module.get<Repository<ExecutionLog>>(
      getRepositoryToken(ExecutionLog),
    );
  });

  describe('executeRequest', () => {
    it('should execute successful GET request', async () => {
      jest.spyOn(httpService, 'request').mockReturnValue(of(mockAxiosResponse));
      jest.spyOn(executionLogRepository, 'create').mockReturnValue({} as ExecutionLog);
      jest.spyOn(executionLogRepository, 'save').mockResolvedValue({} as ExecutionLog);

      const result = await service.executeRequest(mockCronJob);

      expect(result).toEqual({
        status: 'success',
        responseCode: 200,
        responseTime: expect.any(Number),
        responseBody: JSON.stringify({ message: 'success' }),
      });

      expect(httpService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://httpbin.org/get',
        headers: { Authorization: 'Bearer token' },
        data: undefined,
        timeout: 30000,
        maxContentLength: 10240,
        maxBodyLength: 10240,
        validateStatus: expect.any(Function),
      });

      expect(executionLogRepository.save).toHaveBeenCalled();
    });

    it('should execute successful POST request with body', async () => {
      const postJob = {
        ...mockCronJob,
        method: HttpMethod.POST,
        body: '{"test": "data"}',
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockAxiosResponse));
      jest.spyOn(executionLogRepository, 'create').mockReturnValue({} as ExecutionLog);
      jest.spyOn(executionLogRepository, 'save').mockResolvedValue({} as ExecutionLog);

      const result = await service.executeRequest(postJob);

      expect(result.status).toBe('success');
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: { test: 'data' },
        }),
      );
    });

    it('should handle non-retryable 4xx errors', async () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: 'Resource not found',
        },
      } as AxiosError;

      jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => error));
      jest.spyOn(executionLogRepository, 'create').mockReturnValue({} as ExecutionLog);
      jest.spyOn(executionLogRepository, 'save').mockResolvedValue({} as ExecutionLog);

      const result = await service.executeRequest(mockCronJob);

      expect(result).toEqual({
        status: 'failure',
        responseCode: 404,
        responseTime: expect.any(Number),
        errorMessage: 'HTTP 404: Not Found - Resource not found',
        retryCount: undefined,
      });

      // Should not retry for 4xx errors
      expect(httpService.request).toHaveBeenCalledTimes(1);
    });

    it('should retry on 5xx errors', async () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        },
      } as AxiosError;

      jest
        .spyOn(httpService, 'request')
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(mockAxiosResponse));

      jest.spyOn(executionLogRepository, 'create').mockReturnValue({} as ExecutionLog);
      jest.spyOn(executionLogRepository, 'save').mockResolvedValue({} as ExecutionLog);

      const result = await service.executeRequest(mockCronJob);

      expect(result.status).toBe('success');
      expect(httpService.request).toHaveBeenCalledTimes(3);
    });

    it('should handle network errors with retry', async () => {
      const error = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      } as AxiosError;

      jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => error));
      jest.spyOn(executionLogRepository, 'create').mockReturnValue({} as ExecutionLog);
      jest.spyOn(executionLogRepository, 'save').mockResolvedValue({} as ExecutionLog);

      const result = await service.executeRequest(mockCronJob);

      expect(result).toEqual({
        status: 'failure',
        responseCode: undefined,
        responseTime: expect.any(Number),
        errorMessage: 'Network error: ECONNREFUSED - Connection refused',
        retryCount: 3,
      });

      // Should retry 3 times
      expect(httpService.request).toHaveBeenCalledTimes(3);
    });

    it('should truncate large response bodies', async () => {
      const largeData = 'x'.repeat(15000);
      const largeResponse = {
        ...mockAxiosResponse,
        data: largeData,
        headers: { 'content-type': 'text/plain' },
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(largeResponse));
      jest.spyOn(executionLogRepository, 'create').mockReturnValue({} as ExecutionLog);
      jest.spyOn(executionLogRepository, 'save').mockResolvedValue({} as ExecutionLog);

      const result = await service.executeRequest(mockCronJob);

      expect(result.status).toBe('success');
      expect(result.responseBody).toContain('... [truncated]');
      expect(result.responseBody!.length).toBeLessThanOrEqual(10240 + 20); // Max size + truncation message
    });

    it('should handle invalid JSON in headers gracefully', async () => {
      const jobWithBadHeaders = {
        ...mockCronJob,
        headers: 'invalid json',
      };

      jest.spyOn(httpService, 'request').mockReturnValue(of(mockAxiosResponse));
      jest.spyOn(executionLogRepository, 'create').mockReturnValue({} as ExecutionLog);
      jest.spyOn(executionLogRepository, 'save').mockResolvedValue({} as ExecutionLog);

      const result = await service.executeRequest(jobWithBadHeaders);

      expect(result.status).toBe('success');
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {},
        }),
      );
    });

    it('should handle timeout errors', async () => {
      const error = {
        code: 'ETIMEDOUT',
        message: 'Request timeout',
      } as AxiosError;

      jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => error));
      jest.spyOn(executionLogRepository, 'create').mockReturnValue({} as ExecutionLog);
      jest.spyOn(executionLogRepository, 'save').mockResolvedValue({} as ExecutionLog);

      const result = await service.executeRequest(mockCronJob);

      expect(result.status).toBe('failure');
      expect(result.errorMessage).toContain('ETIMEDOUT');
      expect(result.retryCount).toBe(3);
    });
  });
});