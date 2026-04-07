import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { SecurityAlert, StolenCar, WantedPerson } from '../models/security.model';

export interface CreateStolenCarPayload {
  plateNumber: string;
  plateNormalized?: string;
  vehicleType?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface CreateWantedPersonPayload {
  fullName: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface UpdateWantedPersonPayload extends CreateWantedPersonPayload {
  faceImagePath?: string;
}

@Injectable({ providedIn: 'root' })
export class SecurityApiService {
  constructor(private readonly http: HttpClient) {}

  getWantedPersons(): Observable<WantedPerson[]> {
    return this.http.get<WantedPerson[]>(`${API_CONFIG.baseUrl}/security/wanted-persons`);
  }

  createWantedPerson(payload: CreateWantedPersonPayload, faceImage: File): Observable<WantedPerson> {
    const formData = new FormData();
    formData.append('fullName', payload.fullName);
    formData.append('status', payload.status || 'active');
    formData.append('notes', payload.notes || '');
    formData.append('faceImage', faceImage);

    return this.http.post<WantedPerson>(`${API_CONFIG.baseUrl}/security/wanted-persons`, formData);
  }

  updateWantedPerson(id: number, payload: UpdateWantedPersonPayload, faceImage?: File | null): Observable<WantedPerson> {
    const formData = new FormData();
    formData.append('fullName', payload.fullName);
    formData.append('status', payload.status || 'active');
    formData.append('notes', payload.notes || '');

    if (payload.faceImagePath) {
      formData.append('faceImagePath', payload.faceImagePath);
    }

    if (faceImage) {
      formData.append('faceImage', faceImage);
    }

    return this.http.put<WantedPerson>(`${API_CONFIG.baseUrl}/security/wanted-persons/${id}`, formData);
  }

  deleteWantedPerson(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_CONFIG.baseUrl}/security/wanted-persons/${id}`);
  }

  getStolenCars(): Observable<StolenCar[]> {
    return this.http.get<StolenCar[]>(`${API_CONFIG.baseUrl}/security/stolen-cars`);
  }

  createStolenCar(payload: CreateStolenCarPayload): Observable<StolenCar> {
    return this.http.post<StolenCar>(`${API_CONFIG.baseUrl}/security/stolen-cars`, payload);
  }

  updateStolenCar(id: number, payload: CreateStolenCarPayload): Observable<StolenCar> {
    return this.http.put<StolenCar>(`${API_CONFIG.baseUrl}/security/stolen-cars/${id}`, payload);
  }

  deleteStolenCar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_CONFIG.baseUrl}/security/stolen-cars/${id}`);
  }

  getSecurityAlerts(): Observable<SecurityAlert[]> {
    return this.http.get<SecurityAlert[]>(`${API_CONFIG.baseUrl}/security/alerts`);
  }
}
