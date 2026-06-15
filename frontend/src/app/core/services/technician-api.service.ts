import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from './auth.service';
import { Technician, CreateTechnicianDto } from '../models/technician.model';

@Injectable({ providedIn: 'root' })
export class TechnicianApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  private headers(): HttpHeaders {
    return new HttpHeaders(this.auth.authHeaders());
  }

  getAll(params: { status?: string; specialization?: string; search?: string } = {}): Observable<Technician[]> {
    let p = new HttpParams();
    if (params.status)         p = p.set('status',         params.status);
    if (params.specialization) p = p.set('specialization', params.specialization);
    if (params.search)         p = p.set('search',         params.search);
    return this.http.get<Technician[]>(`${API_CONFIG.baseUrl}/technicians`, { headers: this.headers(), params: p });
  }

  getById(id: string): Observable<Technician> {
    return this.http.get<Technician>(`${API_CONFIG.baseUrl}/technicians/${id}`, { headers: this.headers() });
  }

  create(dto: CreateTechnicianDto): Observable<Technician> {
    return this.http.post<Technician>(`${API_CONFIG.baseUrl}/technicians`, dto, { headers: this.headers() });
  }

  update(id: string, dto: Partial<CreateTechnicianDto>): Observable<Technician> {
    return this.http.put<Technician>(`${API_CONFIG.baseUrl}/technicians/${id}`, dto, { headers: this.headers() });
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_CONFIG.baseUrl}/technicians/${id}`, { headers: this.headers() });
  }
}
