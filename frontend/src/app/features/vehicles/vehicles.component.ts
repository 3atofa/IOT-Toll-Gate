import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/config/api.config';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

interface Vehicle {
  id: string;
  licensePlate: string;
  vehicleType: string;
  ownerName: string;
  ownerContact: string;
  status: 'allowed' | 'blocked' | 'pending';
  lastPassageAt: string;
  passageCount: number;
  registrationExpiry: string;
}

interface VehicleResponse {
  total: number;
  count: number;
  offset: number;
  limit: number;
  vehicles: Vehicle[];
}

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="p-3 sm:p-4 md:p-8">
      <div class="mb-4 sm:mb-8 flex flex-wrap justify-between items-center gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 mb-1 sm:mb-2">{{ 'vehicles.title' | t }}</h1>
          <p class="text-sm sm:text-base text-slate-600">{{ 'vehicles.subtitle' | t }}</p>
        </div>
        <button (click)="openAddVehicleDialog()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition flex items-center gap-2 text-sm sm:text-base">
          <i class="fas fa-plus"></i> <span>{{ 'vehicles.add' | t }}</span>
        </button>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div class="bg-white rounded-lg shadow p-4 sm:p-6 border-l-4 border-blue-500">
          <p class="text-slate-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{{ 'vehicles.total' | t }}</p>
          <p class="text-2xl sm:text-3xl font-bold text-slate-800">{{ stats.totalVehicles || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 sm:p-6 border-l-4 border-green-500">
          <p class="text-slate-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{{ 'vehicles.allowed' | t }}</p>
          <p class="text-2xl sm:text-3xl font-bold text-green-600">{{ stats.allowedVehicles || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 sm:p-6 border-l-4 border-red-500">
          <p class="text-slate-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{{ 'vehicles.blocked' | t }}</p>
          <p class="text-2xl sm:text-3xl font-bold text-red-600">{{ stats.blockedVehicles || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 sm:p-6 border-l-4 border-yellow-500">
          <p class="text-slate-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{{ 'vehicles.latestPassages' | t }}</p>
          <p class="text-2xl sm:text-3xl font-bold text-yellow-600">{{ stats.passagesInPeriod || 0 }}</p>
        </div>
      </div>

      <div class="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <input
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearch()"
          type="text"
          [placeholder]="'vehicles.searchPlaceholder' | t"
          class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
        <select
          [(ngModel)]="statusFilter"
          (ngModelChange)="onFilterChange()"
          class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{{ 'common.allStatus' | t }}</option>
          <option value="allowed">{{ 'vehicles.allowed' | t }}</option>
          <option value="blocked">{{ 'vehicles.blocked' | t }}</option>
          <option value="pending">{{ 'vehicles.pending' | t }}</option>
        </select>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px]">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'vehicles.licensePlate' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'vehicles.owner' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'vehicles.type' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'common.status' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'vehicles.passages' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'vehicles.lastPassage' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'common.actions' | t }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let vehicle of vehicles" class="border-b border-slate-200 hover:bg-slate-50 transition">
                <td class="px-4 sm:px-6 py-4">
                  <span class="font-bold text-slate-800">{{ vehicle.licensePlate }}</span>
                </td>
                <td class="px-4 sm:px-6 py-4 text-sm text-slate-600">{{ vehicle.ownerName || ('common.na' | t) }}</td>
                <td class="px-4 sm:px-6 py-4 text-sm text-slate-600 capitalize">{{ vehicle.vehicleType }}</td>
                <td class="px-4 sm:px-6 py-4">
                  <span class="px-3 py-1 rounded-full text-xs font-bold"
                        [ngClass]="{
                          'bg-green-100 text-green-800': vehicle.status === 'allowed',
                          'bg-red-100 text-red-800': vehicle.status === 'blocked',
                          'bg-yellow-100 text-yellow-800': vehicle.status === 'pending'
                        }">
                    {{ vehicle.status | uppercase }}
                  </span>
                </td>
                <td class="px-4 sm:px-6 py-4 text-sm font-medium text-slate-800">{{ vehicle.passageCount }}</td>
                <td class="px-4 sm:px-6 py-4 text-sm text-slate-600">{{ vehicle.lastPassageAt ? (vehicle.lastPassageAt | date:'short') : ('common.never' | t) }}</td>
                <td class="px-4 sm:px-6 py-4 flex gap-2">
                  <button class="text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-edit"></i> {{ 'common.edit' | t }}
                  </button>
                  <button class="text-red-600 hover:text-red-800 text-sm">
                    <i class="fas fa-trash"></i> {{ 'common.delete' | t }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="vehicles.length === 0" class="text-center py-8">
          <i class="fas fa-car text-4xl text-slate-400 mb-4"></i>
          <p class="text-slate-600">{{ 'vehicles.empty' | t }}</p>
        </div>
      </div>

      <div *ngIf="totalVehicles > 0" class="mt-6 flex flex-wrap justify-between items-center gap-3">
        <p class="text-sm text-slate-600">{{ 'vehicles.showing' | t }} {{ vehicles.length }} {{ 'vehicles.of' | t }} {{ totalVehicles }} {{ 'vehicles.vehicles' | t }}</p>
        <div class="flex gap-2 items-center">
          <button
            (click)="previousPage()"
            [disabled]="currentPage === 1"
            class="px-3 sm:px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm"
          >
            {{ 'common.previous' | t }}
          </button>
          <span class="px-2 sm:px-4 py-2 text-slate-600 text-sm">{{ 'common.page' | t }} {{ currentPage }}</span>
          <button
            (click)="nextPage()"
            [disabled]="!hasMore"
            class="px-3 sm:px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm"
          >
            {{ 'common.next' | t }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class VehiclesComponent implements OnInit {
  vehicles: Vehicle[] = [];
  totalVehicles = 0;
  currentPage = 1;
  limit = 20;
  searchTerm = '';
  statusFilter = '';
  hasMore = false;

  stats = {
    totalVehicles: 0,
    allowedVehicles: 0,
    blockedVehicles: 0,
    passagesInPeriod: 0,
  };

  readonly i18n = inject(I18nService);

  constructor(
    private http: HttpClient,
    private feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadVehicles();
    this.loadStatistics();
  }

  loadVehicles(): void {
    const offset = (this.currentPage - 1) * this.limit;
    const params: Record<string, string> = { limit: this.limit.toString(), offset: offset.toString() };
    if (this.searchTerm) params['search'] = this.searchTerm;
    if (this.statusFilter) params['status'] = this.statusFilter;

    let url = `${API_CONFIG.baseUrl}/vehicles?`;
    Object.entries(params).forEach(([key, value]) => {
      url += `${key}=${value}&`;
    });

    this.http.get<VehicleResponse>(url).subscribe({
      next: (response) => {
        this.vehicles = response.vehicles;
        this.totalVehicles = response.total;
        this.hasMore = (offset + this.limit) < response.total;
      },
      error: () => {
        this.feedback.errorToast(this.i18n.t('vehicles.empty'));
      },
    });
  }

  loadStatistics(): void {
    this.http.get(`${API_CONFIG.baseUrl}/vehicles/stats`).subscribe({
      next: (stats: any) => { this.stats = stats; },
      error: () => { /* silent */ },
    });
  }

  onSearch(): void { this.currentPage = 1; this.loadVehicles(); }
  onFilterChange(): void { this.currentPage = 1; this.loadVehicles(); }
  nextPage(): void { if (this.hasMore) { this.currentPage++; this.loadVehicles(); } }
  previousPage(): void { if (this.currentPage > 1) { this.currentPage--; this.loadVehicles(); } }

  openAddVehicleDialog(): void {
    this.feedback.infoToast('Add vehicle feature coming soon');
  }
}
