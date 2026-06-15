import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from './auth.service';

export interface SearchResults {
  query: string;
  results: {
    captures?: any[];
    vehicles?: any[];
    incidents?: any[];
    technicians?: any[];
  };
}

@Injectable({ providedIn: 'root' })
export class SearchApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  private headers(): HttpHeaders {
    return new HttpHeaders(this.auth.authHeaders());
  }

  search(q: string, types?: string[], limit = 10): Observable<SearchResults> {
    let p = new HttpParams().set('q', q).set('limit', limit);
    if (types && types.length > 0) p = p.set('types', types.join(','));
    return this.http.get<SearchResults>(`${API_CONFIG.baseUrl}/search`, { headers: this.headers(), params: p });
  }
}
