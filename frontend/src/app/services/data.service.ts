import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DataExport {
  metadata: {
    exportedAt: string;
    version: string;
    counts: {
      cronJobs: number;
      executionLogs: number;
      tags: number;
    };
  };
  data: {
    cronJobs: any[];
    executionLogs: any[];
    tags: any[];
  };
}

export interface ImportResult {
  success: boolean;
  imported: {
    tags: number;
    cronJobs: number;
    executionLogs: number;
  };
  errors: any[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = environment.apiUrl + '/data';

  constructor(private http: HttpClient) {}

  exportData(): Observable<DataExport> {
    return this.http.get<DataExport>(`${this.apiUrl}/export`);
  }

  importData(data: any, clearExisting: boolean = false): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.apiUrl}/import`, {
      ...data,
      clearExisting
    });
  }

  importFromFile(file: File, clearExisting: boolean = false): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clearExisting', String(clearExisting));
    
    return this.http.post<ImportResult>(`${this.apiUrl}/import/file`, formData);
  }

  validateData(data: any): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.apiUrl}/validate`, data);
  }
}