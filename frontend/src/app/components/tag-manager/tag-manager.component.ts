import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { TagService } from '../../services/tag.service';
import { Tag } from '../../models/tag.model';

@Component({
  selector: 'app-tag-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './tag-manager.component.html',
  styleUrl: './tag-manager.component.scss'
})
export class TagManagerComponent implements OnInit {
  tags: Tag[] = [];
  displayedColumns: string[] = ['name', 'color', 'usageCount', 'actions'];
  tagForm: FormGroup;
  editingTag: Tag | null = null;
  showForm = false;

  predefinedColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#48DBFB', '#A3CB38', '#FD7272',
    '#9AECDB', '#D6A2E8', '#6C5CE7', '#A8E6CF', '#FFD3B6'
  ];

  constructor(
    private tagService: TagService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.tagForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      color: ['#808080', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTags();
  }

  loadTags(): void {
    this.tagService.getTags().subscribe({
      next: (tags) => {
        this.tags = tags;
      },
      error: (error) => {
        this.snackBar.open('Failed to load tags', 'Close', { duration: 3000 });
        console.error('Error loading tags:', error);
      }
    });
  }

  openForm(tag?: Tag): void {
    this.showForm = true;
    if (tag) {
      this.editingTag = tag;
      this.tagForm.patchValue({
        name: tag.name,
        color: tag.color
      });
    } else {
      this.editingTag = null;
      this.tagForm.reset({
        color: this.predefinedColors[Math.floor(Math.random() * this.predefinedColors.length)]
      });
    }
  }

  closeForm(): void {
    this.showForm = false;
    this.editingTag = null;
    this.tagForm.reset();
  }

  saveTag(): void {
    if (this.tagForm.invalid) {
      return;
    }

    const tagData = this.tagForm.value;

    if (this.editingTag) {
      this.tagService.updateTag(this.editingTag.id, tagData).subscribe({
        next: (updatedTag) => {
          const index = this.tags.findIndex(t => t.id === updatedTag.id);
          if (index !== -1) {
            this.tags[index] = updatedTag;
            this.tags = [...this.tags];
          }
          this.snackBar.open('Tag updated successfully', 'Close', { duration: 3000 });
          this.closeForm();
        },
        error: (error) => {
          this.snackBar.open('Failed to update tag', 'Close', { duration: 3000 });
          console.error('Error updating tag:', error);
        }
      });
    } else {
      this.tagService.createTag(tagData).subscribe({
        next: (newTag) => {
          this.tags = [...this.tags, newTag];
          this.snackBar.open('Tag created successfully', 'Close', { duration: 3000 });
          this.closeForm();
        },
        error: (error) => {
          this.snackBar.open('Failed to create tag', 'Close', { duration: 3000 });
          console.error('Error creating tag:', error);
        }
      });
    }
  }

  deleteTag(tag: Tag): void {
    if (confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      this.tagService.deleteTag(tag.id).subscribe({
        next: () => {
          this.tags = this.tags.filter(t => t.id !== tag.id);
          this.snackBar.open('Tag deleted successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          this.snackBar.open('Failed to delete tag', 'Close', { duration: 3000 });
          console.error('Error deleting tag:', error);
        }
      });
    }
  }

  setColor(color: string): void {
    this.tagForm.patchValue({ color });
  }
}