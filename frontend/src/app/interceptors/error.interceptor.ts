import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private snackBar: MatSnackBar) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unknown error occurred';
        
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Error: ${error.error.message}`;
        } else {
          // Server-side error
          if (error.status === 0) {
            errorMessage = 'Unable to connect to the server. Please check if the server is running.';
          } else if (error.status === 404) {
            errorMessage = 'The requested resource was not found';
          } else if (error.status === 400) {
            errorMessage = error.error?.message || 'Bad request';
          } else if (error.status === 500) {
            errorMessage = 'Internal server error occurred';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else {
            errorMessage = `Error ${error.status}: ${error.statusText}`;
          }
        }
        
        // Show error message in snackbar
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        
        return throwError(() => error);
      })
    );
  }
}