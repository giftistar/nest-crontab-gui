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
import { Observable, catchError, of } from 'rxjs';

import { JobService } from '../../services/job.service';
import { CronJob, HttpMethod, ScheduleType } from '../../models/cronjob.model';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [
    CommonModule,
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
    MatTooltipModule
  ],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.scss'
})
export class JobListComponent implements OnInit {
  jobs: CronJob[] = [];
  loading = true;
  displayedColumns: string[] = [
    'name', 
    'url', 
    'method', 
    'schedule', 
    'scheduleType',
    'isActive', 
    'lastExecutedAt', 
    'executionCount', 
    'actions'
  ];

  constructor(
    private jobService: JobService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading = true;
    this.jobService.getAllJobs()
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
        this.loading = false;
      });
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
            this.snackBar.open('Job deleted successfully', 'Close', {
              duration: 2000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          }
        });
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

  formatLastExecuted(lastExecutedAt: string | undefined): string {
    if (!lastExecutedAt) return 'Never';
    return new Date(lastExecutedAt).toLocaleString();
  }
}
