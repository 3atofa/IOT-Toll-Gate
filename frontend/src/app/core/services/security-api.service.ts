import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { SecurityAlert, StolenCar } from '../models/security.model';

export interface CreateStolenCarPayload {
  plateNumber: string;
  plateNormalized?: string;
  vehicleType?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class SecurityApiService {
  constructor(private readonly http: HttpClient) {}

  getStolenCars(): Observable<StolenCar[]> {
    return this.http.get<StolenCar[]>(`${API_CONFIG.baseUrl}/security/stolen-cars`);
  }

  createStolenCar(payload: CreateStolenCarPayload): Observable<StolenCar> {
    return this.http.post<StolenCar>(`${API_CONFIG.baseUrl}/security/stolen-cars`, payload);
  }

  getSecurityAlerts(): Observable<SecurityAlert[]> {
    return this.http.get<SecurityAlert[]>(`${API_CONFIG.baseUrl}/security/alerts`);
  }
}
