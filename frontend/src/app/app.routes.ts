import { Routes } from '@angular/router';
import { JobListComponent } from './components/job-list/job-list.component';
import { JobFormComponent } from './components/job-form/job-form.component';
import { JobDetailsComponent } from './components/job-details/job-details.component';
import { LogViewerComponent } from './components/log-viewer/log-viewer.component';

export const routes: Routes = [
  { path: '', redirectTo: '/jobs', pathMatch: 'full' },
  { path: 'jobs', component: JobListComponent },
  { path: 'jobs/new', component: JobFormComponent },
  { path: 'jobs/:id/edit', component: JobFormComponent },
  { path: 'jobs/:id', component: JobDetailsComponent },
  { path: 'logs', component: LogViewerComponent },
  { path: 'logs/:jobId', component: LogViewerComponent }
];
