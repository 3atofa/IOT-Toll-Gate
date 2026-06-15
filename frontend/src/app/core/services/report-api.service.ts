import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ReportSummary, TrafficReport, SecurityReport, AlprReport, FinancialReport, IncidentsReport } from '../models/report.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
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
    const url = API_CONFIG.baseUrl + '/reports/summary';
    return this.http.get<ReportSummary>(url, { params: this.buildParams(startDate, endDate), headers: this.headers() });
  }

  getTrafficReport(startDate?: string, endDate?: string, gateId?: string): Observable<TrafficReport> {
    const url = API_CONFIG.baseUrl + '/reports/traffic';
    return this.http.get<TrafficReport>(url, { params: this.buildParams(startDate, endDate, gateId), headers: this.headers() });
  }

  getSecurityReport(startDate?: string, endDate?: string): Observable<SecurityReport> {
    const url = API_CONFIG.baseUrl + '/reports/security';
    return this.http.get<SecurityReport>(url, { params: this.buildParams(startDate, endDate), headers: this.headers() });
  }

  getAlprReport(startDate?: string, endDate?: string): Observable<AlprReport> {
    const url = API_CONFIG.baseUrl + '/reports/alpr';
    return this.http.get<AlprReport>(url, { params: this.buildParams(startDate, endDate), headers: this.headers() });
  }

  getFinancialReport(startDate?: string, endDate?: string): Observable<FinancialReport> {
    const url = API_CONFIG.baseUrl + '/reports/financial';
    return this.http.get<FinancialReport>(url, { params: this.buildParams(startDate, endDate), headers: this.headers() });
  }

  getIncidentsReport(startDate?: string, endDate?: string): Observable<IncidentsReport> {
    const url = API_CONFIG.baseUrl + '/reports/incidents';
    return this.http.get<IncidentsReport>(url, { params: this.buildParams(startDate, endDate), headers: this.headers() });
  }

  downloadPdf(
    type: 'summary' | 'traffic' | 'security' | 'alpr' | 'full',
    startDate?: string,
    endDate?: string,
    lang: 'en' | 'ar' = 'en',
  ): Observable<Blob> {
    let params = this.buildParams(startDate, endDate);
    params = params.set('type', type);
    if (lang === 'ar') { params = params.set('lang', 'ar'); }
    return this.http.get(API_CONFIG.baseUrl + '/reports/pdf', { params, headers: this.headers(), responseType: 'blob' });
  }

  downloadCsv(type: 'captures' | 'alerts', startDate?: string, endDate?: string, gateId?: string): Observable<Blob> {
    let params = this.buildParams(startDate, endDate, gateId);
    params = params.set('type', type);
    return this.http.get(API_CONFIG.baseUrl + '/reports/csv', { params, headers: this.headers(), responseType: 'blob' });
  }

  downloadFinancialPdf(startDate?: string, endDate?: string, lang: 'en' | 'ar' = 'en'): Observable<Blob> {
    let params = this.buildParams(startDate, endDate);
    if (lang === 'ar') { params = params.set('lang', 'ar'); }
    return this.http.get(API_CONFIG.baseUrl + '/reports/financial-pdf', { params, headers: this.headers(), responseType: 'blob' });
  }

  downloadIncidentsPdf(startDate?: string, endDate?: string, lang: 'en' | 'ar' = 'en'): Observable<Blob> {
    let params = this.buildParams(startDate, endDate);
    if (lang === 'ar') { params = params.set('lang', 'ar'); }
    return this.http.get(API_CONFIG.baseUrl + '/reports/incidents-pdf', { params, headers: this.headers(), responseType: 'blob' });
  }
}
