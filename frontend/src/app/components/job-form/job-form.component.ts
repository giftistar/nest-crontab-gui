import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of, switchMap } from 'rxjs';

import { JobService } from '../../services/job.service';
import { ScheduleValidatorService } from '../../services/schedule-validator.service';
import { CronJob, CreateCronJobDto, UpdateCronJobDto, HttpMethod, ScheduleType } from '../../models/cronjob.model';

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './job-form.component.html',
  styleUrl: './job-form.component.scss'
})
export class JobFormComponent implements OnInit {
  jobForm: FormGroup;
  isEditMode = false;
  jobId: string | null = null;
  loading = false;
  saving = false;
  
  httpMethods = Object.values(HttpMethod);
  scheduleTypes = Object.values(ScheduleType);

  constructor(
    private fb: FormBuilder,
    private jobService: JobService,
    private scheduleValidator: ScheduleValidatorService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.jobForm = this.createForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.jobId = params['id'];
        this.loadJob();
      }
    });

    // Watch schedule type changes to reset schedule validation
    this.jobForm.get('scheduleType')?.valueChanges.subscribe(() => {
      this.jobForm.get('schedule')?.updateValueAndValidity();
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      method: [HttpMethod.GET, Validators.required],
      headers: [''],
      body: [''],
      schedule: ['0 0 * * *', [Validators.required, this.validateSchedule.bind(this)]],
      scheduleType: [ScheduleType.CRON, Validators.required],
      isActive: [true],
      requestTimeout: ['', [Validators.min(1), Validators.max(300)]]
    });
  }

  private validateSchedule(control: any): { [key: string]: any } | null {
    const scheduleType = this.jobForm?.get('scheduleType')?.value || ScheduleType.CRON;
    const schedule = control.value;

    if (!schedule) {
      return { required: true };
    }

    const validation = this.scheduleValidator.validateSchedule(schedule, scheduleType);
    return validation.isValid ? null : { invalidSchedule: { message: validation.errorMessage } };
  }

  private loadJob(): void {
    if (!this.jobId) return;

    this.loading = true;
    this.jobService.getJob(this.jobId)
      .pipe(
        catchError(error => {
          console.error('Error loading job:', error);
          this.snackBar.open('Error loading job', 'Close', {
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
        if (job) {
          this.populateForm(job);
        }
      });
  }

  private populateForm(job: CronJob): void {
    this.jobForm.patchValue({
      name: job.name,
      description: job.description || '',
      url: job.url,
      method: job.method,
      headers: job.headers || '',
      body: job.body || '',
      schedule: job.schedule,
      scheduleType: job.scheduleType,
      isActive: job.isActive,
      requestTimeout: job.requestTimeout ? job.requestTimeout / 1000 : '' // Convert from ms to seconds
    });
  }

  onSubmit(): void {
    if (this.jobForm.valid) {
      this.saving = true;
      const formValue = this.jobForm.value;
      
      // Clean up empty optional fields and convert timeout to milliseconds
      const jobData = {
        ...formValue,
        description: formValue.description || undefined,
        headers: formValue.headers || undefined,
        body: formValue.body || undefined,
        requestTimeout: formValue.requestTimeout ? formValue.requestTimeout * 1000 : undefined // Convert seconds to milliseconds
      };

      const operation = this.isEditMode && this.jobId
        ? this.jobService.updateJob(this.jobId, jobData as UpdateCronJobDto)
        : this.jobService.createJob(jobData as CreateCronJobDto);

      operation
        .pipe(
          catchError(error => {
            console.error('Error saving job:', error);
            this.snackBar.open(
              `Error ${this.isEditMode ? 'updating' : 'creating'} job`, 
              'Close',
              {
                duration: 3000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
              }
            );
            return of(null);
          })
        )
        .subscribe(job => {
          this.saving = false;
          if (job) {
            this.snackBar.open(
              `Job ${this.isEditMode ? 'updated' : 'created'} successfully`,
              'Close',
              {
                duration: 2000,
                horizontalPosition: 'right',
                verticalPosition: 'top'
              }
            );
            this.router.navigate(['/jobs']);
          }
        });
    } else {
      this.markFormGroupTouched(this.jobForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  onCancel(): void {
    this.router.navigate(['/jobs']);
  }

  onReset(): void {
    if (this.isEditMode && this.jobId) {
      this.loadJob();
    } else {
      this.jobForm.reset({
        method: HttpMethod.GET,
        scheduleType: ScheduleType.CRON,
        schedule: '0 0 * * *',
        isActive: true,
        requestTimeout: ''
      });
    }
  }

  getTitle(): string {
    return this.isEditMode ? 'Edit Job' : 'Create New Job';
  }

  getSubmitButtonText(): string {
    return this.isEditMode ? 'Update Job' : 'Create Job';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.jobForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.jobForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    if (errors['required']) return `${fieldName} is required`;
    if (errors['minlength']) return `${fieldName} is too short`;
    if (errors['pattern'] && fieldName === 'url') return 'Please enter a valid URL (http:// or https://)';
    if (errors['invalidSchedule']) return errors['invalidSchedule'].message;
    if (errors['min'] && fieldName === 'requestTimeout') return 'Timeout must be at least 1 second';
    if (errors['max'] && fieldName === 'requestTimeout') return 'Timeout cannot exceed 300 seconds';

    return 'Invalid input';
  }

  getScheduleHint(): string {
    const scheduleType = this.jobForm.get('scheduleType')?.value;
    if (scheduleType === ScheduleType.CRON) {
      return 'Cron format: second minute hour day month weekday (e.g., "0 0 12 * * *" = daily at noon)';
    }
    return 'Repeat format: number + unit (e.g., "5s", "10m", "1h", "2d")';
  }

  onScheduleTypeChange(): void {
    const scheduleType = this.jobForm.get('scheduleType')?.value;
    const scheduleControl = this.jobForm.get('schedule');
    
    // Set default schedule based on type
    if (scheduleType === ScheduleType.CRON) {
      scheduleControl?.setValue('0 0 * * *');
    } else {
      scheduleControl?.setValue('5m');
    }
  }

  shouldShowBodyField(): boolean {
    const method = this.jobForm.get('method')?.value;
    return method === HttpMethod.POST || method === HttpMethod.PUT;
  }
}
