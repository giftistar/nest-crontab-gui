import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-tag-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>Create New Tag</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Tag Name</mat-label>
        <input matInput [(ngModel)]="tagName" placeholder="Enter tag name" required>
      </mat-form-field>
      
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Tag Color</mat-label>
        <input matInput type="color" [(ngModel)]="tagColor" required>
      </mat-form-field>
      
      <div class="color-preview">
        <span>Preview:</span>
        <span class="tag-preview" [style.background-color]="tagColor" [style.color]="'white'">
          {{ tagName || 'Tag Name' }}
        </span>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onCreate()" [disabled]="!tagName || !tagColor">
        Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 350px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .color-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }
    
    .tag-preview {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
    }
  `]
})
export class TagCreateDialogComponent {
  tagName = '';
  tagColor = '#2196f3'; // Default blue color

  constructor(
    public dialogRef: MatDialogRef<TagCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreate(): void {
    if (this.tagName && this.tagColor) {
      this.dialogRef.close({
        name: this.tagName.trim(),
        color: this.tagColor
      });
    }
  }
}