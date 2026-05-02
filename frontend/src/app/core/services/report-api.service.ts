import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ReportSummary, TrafficReport, SecurityReport, AlprReport } from '../models/report.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  private buildParams(startDate?: string, endDate?: string, gateId?: string): HttpParams {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate)   params = params.set('endDate',   endDate);
    if (gateId)    params = params.set('gateId',    gateId);
    return params;
  }

  private headers(): HttpHeaders {
    return new HttpHeaders(this.auth.authHeaders());
  }

  getSummary(startDate?: string, endDate?: string): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`${API_CONFIG.baseUrl}/reports/summary`, {
      params: this.buildParams(startDate, endDate),
      headers: this.headers(),
    });
  }

  getTrafficReport(startDate?: string, endDate?: string, gateId?: string): Observable<TrafficReport> {
    return this.http.get<TrafficReport>(`${API_CONFIG.baseUrl}/reports/traffic`, {
      params: this.buildParams(startDate, endDate, gateId),
      headers: this.headers(),
    });
  }

  getSecurityReport(startDate?: string, endDate?: string): Observable<SecurityReport> {
    return this.http.get<SecurityReport>(`${API_CONFIG.baseUrl}/reports/security`, {
      params: this.buildParams(startDate, endDate),
      headers: this.headers(),
    });
  }

  getAlprReport(startDate?: string, endDate?: string): Observable<AlprReport> {
    return this.http.get<AlprReport>(`${API_CONFIG.baseUrl}/reports/alpr`, {
      params: this.buildParams(startDate, endDate),
      headers: this.headers(),
    });
  }

  downloadPdf(
    type: 'summary' | 'traffic' | 'security' | 'alpr' | 'full' = 'summary',
    startDate?: string,
    endDate?: string,
  ): Observable<Blob> {
    let params = this.buildParams(startDate, endDate);
    params = params.set('type', type);
    return this.http.get(`${API_CONFIG.baseUrl}/reports/pdf`, {
      params,
      headers: this.headers(),
      responseType: 'blob',
    });
  }

  downloadCsv(type: 'captures' | 'alerts', startDate?: string, endDate?: string, gateId?: string): Observable<Blob> {
    let params = this.buildParams(startDate, endDate, gateId);
    params = params.set('type', type);
    return this.http.get(`${API_CONFIG.baseUrl}/reports/csv`, {
      params,
      headers: this.headers(),
      responseType: 'blob',
    });
  }
}
