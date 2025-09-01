import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable, catchError, of, interval, Subscription } from 'rxjs';

import { JobService } from '../../services/job.service';
import { CronJob, HttpMethod, ScheduleType } from '../../models/cronjob.model';
import { ExecutionLog, ExecutionStatus, PaginatedLogs } from '../../models/execution-log.model';
import { LogViewerComponent } from '../log-viewer/log-viewer.component';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatChipsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatDialogModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSortModule
  ],
  templateUrl: './job-details.component.html',
  styleUrl: './job-details.component.scss'
})
export class JobDetailsComponent implements OnInit, OnDestroy {
  job: CronJob | null = null;
  logs: ExecutionLog[] = [];
  filteredLogs: ExecutionLog[] = [];
  totalLogs = 0;
  loading = true;
  logsLoading = false;
  
  // Pagination
  pageSize = 10;
  currentPage = 0;
  
  // Auto-refresh
  autoRefresh = true;
  refreshSubscription?: Subscription;
  isViewingDetails = false; // Track if user is viewing log details
  
  // Tab management
  selectedTabIndex = 2; // Start with Execution History tab (index 2)
  
  // Filters
  dateRangeStart: Date | null = null;
  dateRangeEnd: Date | null = null;
  timeRangeStart: string = '00:00';
  timeRangeEnd: string = '23:59';
  selectedStatus: ExecutionStatus | 'all' = 'all';
  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: ExecutionStatus.SUCCESS, label: 'Success' },
    { value: ExecutionStatus.ERROR, label: 'Error' },
    { value: ExecutionStatus.TIMEOUT, label: 'Timeout' }
  ];
  
  // Table columns - Added 'response' column
  displayedColumns: string[] = ['executedAt', 'status', 'duration', 'httpStatus', 'response', 'triggeredManually', 'actions'];
  
  // Sorting
  sortActive: string = 'executedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  private jobId: string | null = null;

  constructor(
    private jobService: JobService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.jobId = params['id'];
      if (this.jobId) {
        this.loadJobDetails();
        this.loadLogs();
        this.startAutoRefresh();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private loadJobDetails(): void {
    if (!this.jobId) return;

    this.loading = true;
    this.jobService.getJob(this.jobId)
      .pipe(
        catchError(error => {
          console.error('Error loading job:', error);
          this.snackBar.open('Error loading job details', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
          this.router.navigate(['/jobs']);
          return of(null);
        })
      )
      .subscribe(job => {
        this.loading = false;
        this.job = job;
      });
  }

  private loadLogs(): void {
    if (!this.jobId) return;

    this.logsLoading = true;
    // Load first 100 logs (max allowed by backend)
    this.jobService.getJobLogs(this.jobId, 1, 100)
      .pipe(
        catchError(error => {
          console.error('Error loading logs:', error);
          this.snackBar.open('Error loading execution logs', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
          return of({
            logs: [],
            total: 0,
            page: 1,
            limit: this.pageSize,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          } as PaginatedLogs);
        })
      )
      .subscribe(result => {
        this.logsLoading = false;
        this.logs = result.logs;
        this.totalLogs = result.total;
        this.applyFilters();
      });
  }

  applyFilters(): void {
    let filtered = [...this.logs];

    // Apply status filter
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(log => log.status === this.selectedStatus);
    }

    // Apply date and time range filter
    if (this.dateRangeStart) {
      const startDate = new Date(this.dateRangeStart);
      const [startHour, startMinute] = this.timeRangeStart.split(':').map(Number);
      startDate.setHours(startHour, startMinute, 0, 0);
      const startTime = startDate.getTime();
      
      filtered = filtered.filter(log => {
        const logTime = new Date(log.executedAt).getTime();
        return logTime >= startTime;
      });
    }

    if (this.dateRangeEnd) {
      const endDate = new Date(this.dateRangeEnd);
      const [endHour, endMinute] = this.timeRangeEnd.split(':').map(Number);
      endDate.setHours(endHour, endMinute, 59, 999);
      const endTime = endDate.getTime();
      
      filtered = filtered.filter(log => {
        const logTime = new Date(log.executedAt).getTime();
        return logTime <= endTime;
      });
    }

    // Apply sorting
    filtered = this.sortData(filtered);

    this.filteredLogs = filtered;
    
    // Apply pagination to filtered results
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredLogs = filtered.slice(startIndex, endIndex);
  }

  sortData(data: ExecutionLog[]): ExecutionLog[] {
    if (!this.sortActive || !this.sortDirection) {
      return data;
    }

    return data.sort((a, b) => {
      const isAsc = this.sortDirection === 'asc';
      switch (this.sortActive) {
        case 'executedAt':
          return this.compare(new Date(a.executedAt).getTime(), new Date(b.executedAt).getTime(), isAsc);
        case 'status':
          return this.compare(a.status, b.status, isAsc);
        case 'duration':
          return this.compare(a.executionTime || 0, b.executionTime || 0, isAsc);
        case 'httpStatus':
          return this.compare(a.responseCode || 0, b.responseCode || 0, isAsc);
        case 'triggeredManually':
          return this.compare(a.triggeredManually ? 1 : 0, b.triggeredManually ? 1 : 0, isAsc);
        default:
          return 0;
      }
    });
  }

  compare(a: number | string, b: number | string, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  onSortChange(sort: Sort): void {
    this.sortActive = sort.active;
    this.sortDirection = sort.direction || 'desc';
    this.applyFilters();
  }

  clearFilters(): void {
    this.dateRangeStart = null;
    this.dateRangeEnd = null;
    this.timeRangeStart = '00:00';
    this.timeRangeEnd = '23:59';
    this.selectedStatus = 'all';
    this.currentPage = 0;
    this.applyFilters();
  }

  private startAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(10000).subscribe(() => {
        // Don't refresh if user is viewing details
        if (!this.isViewingDetails) {
          this.loadJobDetails();
          this.loadLogs();
        }
      });
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  goBack(): void {
    this.router.navigate(['/jobs']);
  }

  editJob(): void {
    if (this.job) {
      this.router.navigate(['/jobs', this.job.id, 'edit']);
    }
  }

  toggleJobStatus(): void {
    if (!this.job) return;

    this.jobService.toggleJobStatus(this.job.id)
      .pipe(
        catchError(error => {
          console.error('Error toggling job status:', error);
          this.snackBar.open('Error toggling job status', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
          return of(null);
        })
      )
      .subscribe(updatedJob => {
        if (updatedJob) {
          this.job = updatedJob;
          this.snackBar.open(
            `Job ${updatedJob.isActive ? 'activated' : 'deactivated'}`, 
            'Close',
            {
              duration: 2000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            }
          );
        }
      });
  }

  triggerJob(): void {
    if (!this.job) return;

    this.jobService.triggerJob(this.job.id)
      .pipe(
        catchError(error => {
          console.error('Error triggering job:', error);
          this.snackBar.open('Error triggering job', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
          return of(null);
        })
      )
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Job triggered successfully', 'Close', {
            duration: 2000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
          // Refresh data after triggering
          setTimeout(() => {
            this.loadJobDetails();
            this.loadLogs();
          }, 1000);
        }
      });
  }

  deleteJob(): void {
    if (!this.job) return;

    if (confirm(`Are you sure you want to delete job "${this.job.name}"?`)) {
      this.jobService.deleteJob(this.job.id)
        .pipe(
          catchError(error => {
            console.error('Error deleting job:', error);
            this.snackBar.open('Error deleting job', 'Close', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
            return of(null);
          })
        )
        .subscribe(result => {
          if (result !== null) {
            this.snackBar.open('Job deleted successfully', 'Close', {
              duration: 2000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
            this.router.navigate(['/jobs']);
          }
        });
    }
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilters();
  }

  viewLogDetails(log: ExecutionLog): void {
    this.isViewingDetails = true;
    const dialogRef = this.dialog.open(LogViewerComponent, {
      width: '80%',
      height: '80%',
      data: { log }
    });
    
    dialogRef.afterClosed().subscribe(() => {
      this.isViewingDetails = false;
    });
  }

  getStatusColor(status: ExecutionStatus): string {
    switch (status) {
      case ExecutionStatus.SUCCESS: return 'primary';
      case ExecutionStatus.ERROR: return 'warn';
      case ExecutionStatus.TIMEOUT: return 'accent';
      default: return '';
    }
  }

  getMethodColor(method: HttpMethod): string {
    switch (method) {
      case HttpMethod.GET: return 'primary';
      case HttpMethod.POST: return 'accent';
      case HttpMethod.PUT: return 'warn';
      case HttpMethod.DELETE: return 'warn';
      default: return '';
    }
  }

  getScheduleTypeColor(scheduleType: ScheduleType): string {
    return scheduleType === ScheduleType.CRON ? 'primary' : 'accent';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatDuration(milliseconds?: number): string {
    if (milliseconds === undefined || milliseconds === null) return 'N/A';
    if (milliseconds === 0) return '0ms';
    if (milliseconds < 1000) return `${milliseconds}ms`;
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }

  formatHeaders(headers?: string): string {
    if (!headers) return 'None';
    try {
      return JSON.stringify(JSON.parse(headers), null, 2);
    } catch {
      return headers;
    }
  }

  formatBody(body?: string): string {
    if (!body) return 'None';
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }

  formatResponsePreview(log: ExecutionLog): string {
    // Show error message if available
    if (log.errorMessage) {
      return `Error: ${log.errorMessage.substring(0, 100)}${log.errorMessage.length > 100 ? '...' : ''}`;
    }
    
    // Show response body preview if available
    if (log.responseBody) {
      const preview = log.responseBody.substring(0, 100);
      return `${preview}${log.responseBody.length > 100 ? '...' : ''}`;
    }
    
    return 'No response';
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }

  clearLogs(): void {
    if (!this.job) return;

    if (confirm('Are you sure you want to clear all execution history for this job? This action cannot be undone.')) {
      this.jobService.clearJobLogs(this.job.id)
        .pipe(
          catchError(error => {
            console.error('Error clearing logs:', error);
            // Error will be displayed by the interceptor
            return of(null);
          })
        )
        .subscribe(result => {
          if (result) {
            this.snackBar.open(`Cleared ${result.deletedCount} log entries`, 'Close', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
            // Reset filters and refresh logs after clearing
            this.clearFilters();
            this.loadLogs();
          }
        });
    }
  }
}
