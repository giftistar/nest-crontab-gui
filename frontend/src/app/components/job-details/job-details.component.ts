import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatTooltipModule
  ],
  templateUrl: './job-details.component.html',
  styleUrl: './job-details.component.scss'
})
export class JobDetailsComponent implements OnInit, OnDestroy {
  job: CronJob | null = null;
  logs: ExecutionLog[] = [];
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
  selectedTabIndex = 0; // Preserve current tab
  
  // Table columns - Added 'response' column
  displayedColumns: string[] = ['executedAt', 'status', 'duration', 'httpStatus', 'response', 'triggeredManually', 'actions'];

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
    this.jobService.getJobLogs(this.jobId, this.currentPage + 1, this.pageSize)
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
      });
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
    this.loadLogs();
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
}
