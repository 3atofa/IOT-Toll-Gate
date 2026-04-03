import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { CaptureListResponse, GateCapture } from '../models/gate-capture.model';

@Injectable({ providedIn: 'root' })
export class CaptureApiService {
  constructor(private readonly http: HttpClient) {}

  getLatestCapture(): Observable<GateCapture> {
    return this.http.get<GateCapture>(`${API_CONFIG.baseUrl}/captures/latest`);
  }

  getCaptures(limit = 25, offset = 0): Observable<CaptureListResponse> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<CaptureListResponse>(`${API_CONFIG.baseUrl}/captures`, { params });
  }
}
