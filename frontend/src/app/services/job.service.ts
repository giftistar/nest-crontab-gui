import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CronJob, CreateCronJobDto, UpdateCronJobDto } from '../models/cronjob.model';
import { PaginatedLogs, LogStatistics, ExecutionStatus } from '../models/execution-log.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private apiUrl = environment.apiUrl || 'http://localhost:3004/api';

  constructor(private http: HttpClient) {}

  // Job CRUD operations
  getAllJobs(tagIds?: string[]): Observable<CronJob[]> {
    let params = new HttpParams();
    
    if (tagIds && tagIds.length > 0) {
      params = params.set('tagIds', tagIds.join(','));
    }
    
    return this.http.get<CronJob[]>(`${this.apiUrl}/jobs`, { params });
  }

  getJob(id: string): Observable<CronJob> {
    return this.http.get<CronJob>(`${this.apiUrl}/jobs/${id}`);
  }

  createJob(job: CreateCronJobDto): Observable<CronJob> {
    return this.http.post<CronJob>(`${this.apiUrl}/jobs`, job);
  }

  updateJob(id: string, job: UpdateCronJobDto): Observable<CronJob> {
    return this.http.put<CronJob>(`${this.apiUrl}/jobs/${id}`, job);
  }

  deleteJob(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/jobs/${id}`);
  }

  toggleJobStatus(id: string): Observable<CronJob> {
    return this.http.put<CronJob>(`${this.apiUrl}/jobs/${id}/toggle`, {});
  }

  // Job execution
  triggerJob(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/jobs/${id}/trigger`, {});
  }

  // Logs
  getJobLogs(
    jobId: string, 
    page: number = 1, 
    limit: number = 20,
    status?: ExecutionStatus,
    startDate?: Date,
    endDate?: Date,
    expand: boolean = false
  ): Observable<PaginatedLogs> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('expand', expand.toString());

    if (status) {
      params = params.set('status', status);
    }
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<PaginatedLogs>(`${this.apiUrl}/jobs/${jobId}/logs`, { params });
  }

  searchLogs(
    page: number = 1,
    limit: number = 20,
    jobName?: string,
    responseContent?: string,
    status?: ExecutionStatus,
    triggeredManually?: boolean
  ): Observable<PaginatedLogs> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (jobName) {
      params = params.set('jobName', jobName);
    }
    if (responseContent) {
      params = params.set('responseContent', responseContent);
    }
    if (status) {
      params = params.set('status', status);
    }
    if (triggeredManually !== undefined) {
      params = params.set('triggeredManually', triggeredManually.toString());
    }

    return this.http.get<PaginatedLogs>(`${this.apiUrl}/logs/search`, { params });
  }

  getLogStatistics(startDate?: Date, endDate?: Date): Observable<LogStatistics> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<LogStatistics>(`${this.apiUrl}/logs/stats`, { params });
  }

  clearJobLogs(id: string): Observable<{ message: string; deletedCount: number }> {
    return this.http.delete<{ message: string; deletedCount: number }>(`${this.apiUrl}/jobs/${id}/logs`);
  }
}