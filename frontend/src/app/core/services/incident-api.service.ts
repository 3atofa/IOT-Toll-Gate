import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from './auth.service';
import { Incident, CreateIncidentDto, TechnicianTask } from '../models/incident.model';

@Injectable({ providedIn: 'root' })
export class IncidentApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  private headers(): HttpHeaders {
    return new HttpHeaders(this.auth.authHeaders());
  }

  getAll(params: { status?: string; severity?: string; gateId?: string; search?: string } = {}): Observable<Incident[]> {
    let p = new HttpParams();
    if (params.status)   p = p.set('status',   params.status);
    if (params.severity) p = p.set('severity', params.severity);
    if (params.gateId)   p = p.set('gateId',   params.gateId);
    if (params.search)   p = p.set('search',   params.search);
    return this.http.get<Incident[]>(`${API_CONFIG.baseUrl}/incidents`, { headers: this.headers(), params: p });
  }

  getById(id: string): Observable<Incident> {
    return this.http.get<Incident>(`${API_CONFIG.baseUrl}/incidents/${id}`, { headers: this.headers() });
  }

  create(dto: CreateIncidentDto): Observable<Incident> {
    return this.http.post<Incident>(`${API_CONFIG.baseUrl}/incidents`, dto, { headers: this.headers() });
  }

  update(id: string, dto: Partial<CreateIncidentDto> & { status?: string; resolutionNotes?: string; resolvedAt?: string }): Observable<Incident> {
    return this.http.put<Incident>(`${API_CONFIG.baseUrl}/incidents/${id}`, dto, { headers: this.headers() });
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_CONFIG.baseUrl}/incidents/${id}`, { headers: this.headers() });
  }

  assign(incidentId: string, technicianId: string, notes?: string): Observable<{ task: TechnicianTask; incident: Incident }> {
    return this.http.post<{ task: TechnicianTask; incident: Incident }>(
      `${API_CONFIG.baseUrl}/incidents/${incidentId}/assign`,
      { technicianId, notes },
      { headers: this.headers() },
    );
  }

  updateTask(incidentId: string, taskId: string, status: string, notes?: string): Observable<TechnicianTask> {
    return this.http.put<TechnicianTask>(
      `${API_CONFIG.baseUrl}/incidents/${incidentId}/tasks/${taskId}`,
      { status, notes },
      { headers: this.headers() },
    );
  }
}
