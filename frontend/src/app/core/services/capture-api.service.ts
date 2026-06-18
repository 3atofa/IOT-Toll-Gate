import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { CaptureListResponse, GateCapture } from '../models/gate-capture.model';

export interface CaptureSearchParams {
  plate?: string;
  eventType?: string;
  securityDecision?: string;
  gateId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class CaptureApiService {
  constructor(private readonly http: HttpClient) {}

  getLatestCapture(): Observable<GateCapture> {
    return this.http.get<GateCapture>(`${API_CONFIG.baseUrl}/captures/latest`);
  }

  getCaptures(search: CaptureSearchParams = {}): Observable<CaptureListResponse> {
    let params = new HttpParams()
      .set('limit', search.limit ?? 20)
      .set('offset', search.offset ?? 0);
    if (search.plate)            params = params.set('plate', search.plate);
    if (search.eventType)        params = params.set('eventType', search.eventType);
    if (search.securityDecision) params = params.set('securityDecision', search.securityDecision);
    if (search.gateId)           params = params.set('gateId', search.gateId);
    if (search.dateFrom)         params = params.set('dateFrom', search.dateFrom);
    if (search.dateTo)           params = params.set('dateTo', search.dateTo);
    return this.http.get<CaptureListResponse>(`${API_CONFIG.baseUrl}/captures`, { params });
  }

  getCapturesForGate(gateId: string, limit = 100, offset = 0): Observable<CaptureListResponse> {
    const params = new HttpParams().set('gateId', gateId).set('limit', limit).set('offset', offset);
    return this.http.get<CaptureListResponse>(`${API_CONFIG.baseUrl}/captures`, { params });
  }
}
