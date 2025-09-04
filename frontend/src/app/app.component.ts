import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { filter, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { JobService } from './services/job.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Cron Job Manager';
  currentRoute = '';
  
  navigationItems = [
    { 
      path: '/jobs', 
      label: 'Jobs', 
      icon: 'work',
      description: 'Manage cron jobs'
    },
    { 
      path: '/logs', 
      label: 'Logs', 
      icon: 'history',
      description: 'View execution history'
    }
  ];

  constructor(
    private router: Router,
    private jobService: JobService,
    private snackBar: MatSnackBar
  ) {
    // Listen to route changes to update current route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.currentRoute = (event as NavigationEnd).url;
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  isActiveRoute(path: string): boolean {
    if (path === '/jobs') {
      return this.currentRoute === '/' || this.currentRoute.startsWith('/jobs');
    }
    return this.currentRoute.startsWith(path);
  }

  createNewJob(): void {
    this.router.navigate(['/jobs/new']);
  }

  goHome(): void {
    this.router.navigate(['/jobs']);
  }

  exportJobs(): void {
    this.jobService.exportJobs()
      .pipe(
        catchError(error => {
          console.error('Error exporting jobs:', error);
          this.snackBar.open('Error exporting jobs', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
          return of(null);
        })
      )
      .subscribe(data => {
        if (data) {
          // Create a blob from the JSON data
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          
          // Create a download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // Generate filename with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          link.download = `cronjobs-export-${timestamp}.json`;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          this.snackBar.open('Jobs exported successfully', 'Close', {
            duration: 2000,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          });
        }
      });
  }
}
