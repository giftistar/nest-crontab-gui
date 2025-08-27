import { Component, OnInit, Inject, Optional } from '@angular/core';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Observable, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';

import { JobService } from '../../services/job.service';
import { ExecutionLog, ExecutionStatus, PaginatedLogs } from '../../models/execution-log.model';
import { CronJob } from '../../models/cronjob.model';

interface DialogData {
  log: ExecutionLog;
}

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatChipsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './log-viewer.component.html',
  styleUrl: './log-viewer.component.scss'
})
export class LogViewerComponent implements OnInit {
  // For dialog mode (single log viewer)
  singleLog: ExecutionLog | null = null;
  isDialogMode = false;

  // For page mode (all logs viewer)
  logs: ExecutionLog[] = [];
  jobs: CronJob[] = [];
  totalLogs = 0;
  loading = false;
  logsLoading = false;

  // Search and filter form
  searchForm: FormGroup;
  
  // Pagination
  pageSize = 20;
  currentPage = 0;
  
  // Table columns
  displayedColumns: string[] = ['executedAt', 'jobName', 'status', 'duration', 'httpStatus', 'triggeredManually', 'actions'];

  // Enum values for dropdowns
  executionStatuses = Object.values(ExecutionStatus);

  constructor(
    private jobService: JobService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: DialogData,
    @Optional() private dialogRef: MatDialogRef<LogViewerComponent>
  ) {
    // Check if this is being used in a dialog
    this.isDialogMode = !!this.data && !!this.dialogRef;
    this.singleLog = this.data?.log || null;

    this.searchForm = this.fb.group({
      jobName: [''],
      responseContent: [''],
      status: [''],
      triggeredManually: ['']
    });
  }

  ngOnInit(): void {
    if (this.isDialogMode) {
      // Dialog mode - show single log details
      return;
    }

    // Page mode - load all logs with search/filter functionality
    this.loadJobs();
    this.loadLogs();

    // Setup search form subscription
    this.searchForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 0;
        this.loadLogs();
      });

    // Check if we have a specific job ID in route
    this.route.params.subscribe(params => {
      if (params['jobId']) {
        this.searchForm.patchValue({ jobName: params['jobId'] });
      }
    });
  }

  private loadJobs(): void {
    this.jobService.getAllJobs()
      .pipe(
        catchError(error => {
          console.error('Error loading jobs:', error);
          return of([]);
        })
      )
      .subscribe(jobs => {
        this.jobs = jobs;
      });
  }

  loadLogs(): void {
    this.logsLoading = true;
    const formValue = this.searchForm.value;

    this.jobService.searchLogs(
      this.currentPage + 1,
      this.pageSize,
      formValue.jobName || undefined,
      formValue.responseContent || undefined,
      formValue.status || undefined,
      formValue.triggeredManually === '' ? undefined : formValue.triggeredManually === 'true'
    )
      .pipe(
        catchError(error => {
          console.error('Error loading logs:', error);
          this.snackBar.open('Error loading logs', 'Close', {
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

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadLogs();
  }

  clearFilters(): void {
    this.searchForm.reset();
    this.currentPage = 0;
    this.loadLogs();
  }

  viewLogDetails(log: ExecutionLog): void {
    // For page mode, we can open a dialog or navigate to job details
    this.router.navigate(['/jobs', log.jobId]);
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  goBack(): void {
    if (this.isDialogMode) {
      this.closeDialog();
    } else {
      this.router.navigate(['/jobs']);
    }
  }

  getStatusColor(status: ExecutionStatus): string {
    switch (status) {
      case ExecutionStatus.SUCCESS: return 'primary';
      case ExecutionStatus.ERROR: return 'warn';
      case ExecutionStatus.TIMEOUT: return 'accent';
      default: return '';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatDuration(milliseconds?: number): string {
    if (!milliseconds) return 'N/A';
    if (milliseconds < 1000) return `${milliseconds}ms`;
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }

  formatJson(jsonString?: string): string {
    if (!jsonString) return 'None';
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  }

  getHttpStatusClass(httpStatus?: number): string {
    if (!httpStatus) return '';
    if (httpStatus >= 200 && httpStatus < 300) return 'success';
    if (httpStatus >= 400) return 'error';
    return 'warning';
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Copied to clipboard', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      this.snackBar.open('Failed to copy to clipboard', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    });
  }

  getJobNameById(jobId: string): string {
    const job = this.jobs.find(j => j.id === jobId);
    return job ? job.name : jobId;
  }
}
