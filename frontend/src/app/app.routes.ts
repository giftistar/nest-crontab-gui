import { Routes } from '@angular/router';
import { JobListComponent } from './components/job-list/job-list.component';
import { JobFormComponent } from './components/job-form/job-form.component';
import { JobDetailsComponent } from './components/job-details/job-details.component';
import { LogViewerComponent } from './components/log-viewer/log-viewer.component';
import { TagManagerComponent } from './components/tag-manager/tag-manager.component';
import { DataManagerComponent } from './components/data-manager/data-manager.component';

export const routes: Routes = [
  { path: '', redirectTo: '/jobs', pathMatch: 'full' },
  { path: 'jobs', component: JobListComponent },
  { path: 'jobs/new', component: JobFormComponent },
  { path: 'jobs/:id/edit', component: JobFormComponent },
  { path: 'jobs/:id', component: JobDetailsComponent },
  { path: 'logs', component: LogViewerComponent },
  { path: 'logs/:jobId', component: LogViewerComponent },
  { path: 'tags', component: TagManagerComponent },
  { path: 'data', component: DataManagerComponent }
];
