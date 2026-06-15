import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SearchApiService, SearchResults } from '../../core/services/search-api.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLink],
  templateUrl: './search.component.html',
})
export class SearchComponent {
  query = '';
  results: SearchResults | null = null;
  loading = false;
  searched = false;

  activeTypes = { captures: true, vehicles: true, incidents: true, technicians: true };

  private search$ = new Subject<string>();

  constructor(private readonly searchApi: SearchApiService) {
    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) => {
        if (!q || q.trim().length < 2) {
          this.results = null;
          this.loading = false;
          return [];
        }
        this.loading = true;
        const types = Object.entries(this.activeTypes)
          .filter(([, v]) => v).map(([k]) => k);
        return this.searchApi.search(q.trim(), types, 15);
      }),
    ).subscribe({
      next: (res: any) => { this.results = res; this.loading = false; this.searched = true; },
      error: () => { this.loading = false; },
    });
  }

  onInput(): void {
    if (this.query.trim().length < 2) { this.results = null; this.searched = false; return; }
    this.search$.next(this.query);
  }

  doSearch(): void {
    if (this.query.trim().length < 2) return;
    this.search$.next(this.query);
  }

  clear(): void { this.query = ''; this.results = null; this.searched = false; }

  get totalResults(): number {
    if (!this.results) return 0;
    return (
      (this.results.results.captures?.length ?? 0) +
      (this.results.results.vehicles?.length ?? 0) +
      (this.results.results.incidents?.length ?? 0) +
      (this.results.results.technicians?.length ?? 0)
    );
  }

  severityClass(s: string): string {
    const map: Record<string, string> = {
      low: 'bg-blue-100 text-blue-700', medium: 'bg-amber-100 text-amber-700',
      high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
    };
    return map[s] ?? 'bg-slate-100 text-slate-600';
  }

  statusClass(s: string): string {
    if (s === 'resolved' || s === 'active') return 'bg-emerald-100 text-emerald-700';
    if (s === 'open' || s === 'inactive')   return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }
}
