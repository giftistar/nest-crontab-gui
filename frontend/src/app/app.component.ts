import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatSnackBarModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Cron Job Manager';
  currentRoute = '';
  isRefreshing = false;
  
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
    },
    {
      path: '/tags',
      label: 'Tags',
      icon: 'label',
      description: 'Manage job tags'
    },
    {
      path: '/data',
      label: 'Data',
      icon: 'backup',
      description: 'Import/Export data'
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

  refreshScheduler(): void {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    this.snackBar.open('Refreshing scheduler...', '', {
      duration: 0,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: 'info-snackbar'
    });

    this.jobService.refreshScheduler()
      .pipe(
        catchError(error => {
          console.error('Error refreshing scheduler:', error);
          this.snackBar.open('Failed to refresh scheduler', 'Close', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: 'error-snackbar'
          });
          return of(null);
        })
      )
      .subscribe(result => {
        this.isRefreshing = false;
        
        if (result && result.success) {
          this.snackBar.open(
            `Scheduler refreshed! ${result.jobsLoaded} active jobs loaded`, 
            'Close', 
            {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
              panelClass: 'success-snackbar'
            }
          );

          // If we're on the jobs page, reload the jobs list
          if (this.currentRoute === '/' || this.currentRoute.startsWith('/jobs')) {
            // Trigger a navigation to refresh the component
            const currentUrl = this.router.url;
            this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              this.router.navigate([currentUrl]);
            });
          }
        } else if (result) {
          this.snackBar.open(
            result.message || 'Failed to refresh scheduler', 
            'Close', 
            {
              duration: 5000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
              panelClass: 'error-snackbar'
            }
          );
        }
      });
  }
}
