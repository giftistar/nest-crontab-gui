import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, of } from 'rxjs';

import { JobService } from '../../services/job.service';
import { TagService } from '../../services/tag.service';
import { CronJob, HttpMethod, ScheduleType } from '../../models/cronjob.model';
import { Tag } from '../../models/tag.model';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatSortModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.scss'
})
export class JobListComponent implements OnInit {
  jobs: CronJob[] = [];
  sortedJobs: CronJob[] = [];
  loading = true;
  displayedColumns: string[] = [
    'name',
    'tags', 
    'url', 
    'method', 
    'schedule', 
    'scheduleType',
    'executionMode',
    'runningStatus',
    'isActive', 
    'lastExecutedAt', 
    'executionCount', 
    'actions'
  ];
  
  // Sorting
  sortActive: string = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Tag filtering
  allTags: Tag[] = [];
  selectedTagIds: string[] = [];

  constructor(
    private jobService: JobService,
    private tagService: TagService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTags();
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading = true;
    this.jobService.getAllJobs(this.selectedTagIds)
      .pipe(
        catchError(error => {
          console.error('Error loading jobs:', error);
          this.snackBar.open('Error loading jobs', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
          return of([]);
        })
      )
      .subscribe(jobs => {
        this.jobs = jobs;
        this.sortData();
        this.loading = false;
      });
  }

  loadTags(): void {
    this.tagService.getTags()
      .pipe(
        catchError(error => {
          console.error('Error loading tags:', error);
          return of([]);
        })
      )
      .subscribe(tags => {
        this.allTags = tags;
      });
  }

  onTagFilterChange(): void {
    this.loadJobs();
  }

  createJob(): void {
    this.router.navigate(['/jobs/new']);
  }

  editJob(job: CronJob): void {
    this.router.navigate(['/jobs', job.id, 'edit']);
  }

  viewJob(job: CronJob): void {
    this.router.navigate(['/jobs', job.id]);
  }

  toggleJobStatus(job: CronJob): void {
    this.jobService.toggleJobStatus(job.id)
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
          const index = this.jobs.findIndex(j => j.id === job.id);
          if (index !== -1) {
            this.jobs[index] = updatedJob;
          }
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

  triggerJob(job: CronJob): void {
    this.jobService.triggerJob(job.id)
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
          // Refresh the job to get updated execution count
          this.loadJobs();
        }
      });
  }

  deleteJob(job: CronJob): void {
    if (confirm(`Are you sure you want to delete job "${job.name}"?`)) {
      this.jobService.deleteJob(job.id)
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
            this.jobs = this.jobs.filter(j => j.id !== job.id);
            this.sortData();  // Re-sort after deletion
            this.snackBar.open('Job deleted successfully', 'Close', {
              duration: 2000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          }
        });
    }
  }

  sortData(): void {
    const data = [...this.jobs];
    
    if (!this.sortActive || !this.sortDirection) {
      this.sortedJobs = data;
      return;
    }

    this.sortedJobs = data.sort((a, b) => {
      const isAsc = this.sortDirection === 'asc';
      switch (this.sortActive) {
        case 'name':
          return this.compare(a.name, b.name, isAsc);
        case 'url':
          return this.compare(a.url, b.url, isAsc);
        case 'method':
          return this.compare(a.method, b.method, isAsc);
        case 'schedule':
          return this.compare(a.schedule, b.schedule, isAsc);
        case 'scheduleType':
          return this.compare(a.scheduleType, b.scheduleType, isAsc);
        case 'isActive':
          return this.compare(a.isActive ? 1 : 0, b.isActive ? 1 : 0, isAsc);
        case 'lastExecutedAt':
          const aTime = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : 0;
          const bTime = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : 0;
          return this.compare(aTime, bTime, isAsc);
        case 'executionCount':
          return this.compare(a.executionCount, b.executionCount, isAsc);
        default:
          return 0;
      }
    });
  }

  onSortChange(sort: Sort): void {
    this.sortActive = sort.active;
    this.sortDirection = sort.direction || 'asc';
    this.sortData();
  }

  compare(a: number | string | boolean, b: number | string | boolean, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
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

  formatLastExecuted(lastExecutedAt: string | undefined): string {
    if (!lastExecutedAt) return 'Never';
    return new Date(lastExecutedAt).toLocaleString();
  }
}
