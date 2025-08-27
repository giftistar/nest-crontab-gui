import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

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
    MatButtonModule
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

  constructor(private router: Router) {
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
}
