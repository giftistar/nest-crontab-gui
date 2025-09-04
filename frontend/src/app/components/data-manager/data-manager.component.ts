import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { DataService, DataExport, ImportResult } from '../../services/data.service';

@Component({
  selector: 'app-data-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatListModule,
    MatDividerModule
  ],
  templateUrl: './data-manager.component.html',
  styleUrl: './data-manager.component.scss'
})
export class DataManagerComponent implements OnInit {
  exporting = false;
  importing = false;
  validating = false;
  
  exportData: DataExport | null = null;
  importFile: File | null = null;
  importData: any = null;
  clearExisting = false;
  
  importResult: ImportResult | null = null;
  validationErrors: string[] = [];

  constructor(
    private dataService: DataService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}

  exportDatabase(): void {
    this.exporting = true;
    this.dataService.exportData().subscribe({
      next: (data) => {
        this.exportData = data;
        this.downloadExport(data);
        this.snackBar.open('Data exported successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open('Export failed: ' + error.message, 'Close', { duration: 5000 });
        console.error('Export error:', error);
      },
      complete: () => {
        this.exporting = false;
      }
    });
  }

  private downloadExport(data: DataExport): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `crontab-export-${timestamp}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.importFile = input.files[0];
      this.validationErrors = [];
      this.importResult = null;
      
      // Read file and validate
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          this.importData = JSON.parse(e.target?.result as string);
          this.validateImportData();
        } catch (error) {
          this.validationErrors = ['Invalid JSON file'];
          this.snackBar.open('Invalid JSON file', 'Close', { duration: 3000 });
        }
      };
      reader.readAsText(this.importFile);
    }
  }

  validateImportData(): void {
    if (!this.importData) return;
    
    this.validating = true;
    this.dataService.validateData(this.importData).subscribe({
      next: (result) => {
        if (result.valid) {
          this.validationErrors = [];
          this.snackBar.open('File is valid and ready to import', 'Close', { duration: 3000 });
        } else {
          this.validationErrors = result.errors;
          this.snackBar.open('File validation failed', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        this.validationErrors = ['Validation failed: ' + error.message];
      },
      complete: () => {
        this.validating = false;
      }
    });
  }

  importDatabase(): void {
    if (!this.importFile || !this.importData) {
      this.snackBar.open('Please select a file first', 'Close', { duration: 3000 });
      return;
    }

    if (this.validationErrors.length > 0) {
      this.snackBar.open('Please fix validation errors first', 'Close', { duration: 3000 });
      return;
    }

    const confirmMessage = this.clearExisting 
      ? 'This will delete all existing data and replace it with the imported data. Are you sure?'
      : 'This will import the data and merge it with existing data. Are you sure?';

    if (!confirm(confirmMessage)) {
      return;
    }

    this.importing = true;
    this.dataService.importFromFile(this.importFile, this.clearExisting).subscribe({
      next: (result) => {
        this.importResult = result;
        if (result.success) {
          const message = `Import successful! Imported: ${result.imported.cronJobs} jobs, ${result.imported.tags} tags, ${result.imported.executionLogs} logs`;
          this.snackBar.open(message, 'Close', { duration: 5000 });
        } else {
          this.snackBar.open('Import completed with errors', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.snackBar.open('Import failed: ' + error.message, 'Close', { duration: 5000 });
        console.error('Import error:', error);
      },
      complete: () => {
        this.importing = false;
      }
    });
  }

  resetImport(): void {
    this.importFile = null;
    this.importData = null;
    this.importResult = null;
    this.validationErrors = [];
    this.clearExisting = false;
    
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}