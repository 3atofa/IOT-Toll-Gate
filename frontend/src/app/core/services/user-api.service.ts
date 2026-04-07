import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from './auth.service';

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'operator' | 'reviewer';
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'operator' | 'reviewer';
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getUsers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${API_CONFIG.baseUrl}/auth/users`, {
      headers: new HttpHeaders(this.auth.authHeaders()),
    });
  }

  createUser(payload: CreateUserPayload): Observable<AppUser> {
    return this.http.post<AppUser>(`${API_CONFIG.baseUrl}/auth/users`, payload, {
      headers: new HttpHeaders(this.auth.authHeaders()),
    });
  }
}
