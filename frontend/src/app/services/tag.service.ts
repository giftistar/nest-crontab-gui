import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tag, CreateTagDto, UpdateTagDto } from '../models/tag.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private apiUrl = environment.apiUrl || 'http://localhost:3004/api';

  constructor(private http: HttpClient) {}

  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`);
  }

  getTag(id: string): Observable<Tag> {
    return this.http.get<Tag>(`${this.apiUrl}/tags/${id}`);
  }

  createTag(tag: CreateTagDto): Observable<Tag> {
    return this.http.post<Tag>(`${this.apiUrl}/tags`, tag);
  }

  updateTag(id: string, tag: UpdateTagDto): Observable<Tag> {
    return this.http.patch<Tag>(`${this.apiUrl}/tags/${id}`, tag);
  }

  deleteTag(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tags/${id}`);
  }

  searchTags(query: string): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags/search`, { params: { query } });
  }
}