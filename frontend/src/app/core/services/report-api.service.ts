import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ReportSummary } from '../models/report.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getSummary(startDate?: string, endDate?: string): Observable<ReportSummary> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<ReportSummary>(`${API_CONFIG.baseUrl}/reports/summary`, {
      params,
      headers: new HttpHeaders(this.auth.authHeaders()),
    });
  }

  downloadPdf(startDate?: string, endDate?: string): Observable<Blob> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get(`${API_CONFIG.baseUrl}/reports/pdf`, {
      params,
      headers: new HttpHeaders(this.auth.authHeaders()),
      responseType: 'blob',
    });
  }
}
