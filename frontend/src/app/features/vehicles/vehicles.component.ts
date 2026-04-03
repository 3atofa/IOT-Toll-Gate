import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/config/api.config';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../core/services/feedback.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8">
      <!-- Header -->
      <div class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-slate-800 mb-2">Vehicle Management</h1>
          <p class="text-slate-600">Track and manage vehicles passing through the gate</p>
        </div>
        <button (click)="openAddVehicleDialog()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition flex items-center gap-2">
          <i class="fas fa-plus"></i> Add Vehicle
        </button>
      </div>

      <!-- Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p class="text-slate-600 text-sm font-medium mb-2">Total Vehicles</p>
          <p class="text-3xl font-bold text-slate-800">{{ stats.totalVehicles || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p class="text-slate-600 text-sm font-medium mb-2">Allowed</p>
          <p class="text-3xl font-bold text-green-600">{{ stats.allowedVehicles || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <p class="text-slate-600 text-sm font-medium mb-2">Blocked</p>
          <p class="text-3xl font-bold text-red-600">{{ stats.blockedVehicles || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <p class="text-slate-600 text-sm font-medium mb-2">Latest Passages</p>
          <p class="text-3xl font-bold text-yellow-600">{{ stats.passagesInPeriod || 0 }}</p>
        </div>
      </div>

      <!-- Search and Filter -->
      <div class="mb-6 flex gap-4">
        <input 
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearch()"
          type="text" 
          placeholder="Search by license plate..." 
          class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
        <select 
          [(ngModel)]="statusFilter"
          (ngModelChange)="onFilterChange()"
          class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="allowed">Allowed</option>
          <option value="blocked">Blocked</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <!-- Vehicles Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">License Plate</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Owner</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Type</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Status</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Passages</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Last Passage</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let vehicle of vehicles" class="border-b border-slate-200 hover:bg-slate-50 transition">
              <td class="px-6 py-4">
                <span class="font-bold text-slate-800">{{ vehicle.licensePlate }}</span>
              </td>
              <td class="px-6 py-4 text-sm text-slate-600">{{ vehicle.ownerName || 'N/A' }}</td>
              <td class="px-6 py-4 text-sm text-slate-600 capitalize">{{ vehicle.vehicleType }}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-bold"
                      [ngClass]="{
                        'bg-green-100 text-green-800': vehicle.status === 'allowed',
                        'bg-red-100 text-red-800': vehicle.status === 'blocked',
                        'bg-yellow-100 text-yellow-800': vehicle.status === 'pending'
                      }">
                  {{ vehicle.status | uppercase }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm font-medium text-slate-800">{{ vehicle.passageCount }}</td>
              <td class="px-6 py-4 text-sm text-slate-600">{{ vehicle.lastPassageAt ? (vehicle.lastPassageAt | date:'short') : 'Never' }}</td>
              <td class="px-6 py-4 flex gap-2">
                <button class="text-blue-600 hover:text-blue-800 text-sm">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button class="text-red-600 hover:text-red-800 text-sm">
                  <i class="fas fa-trash"></i> Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div *ngIf="vehicles.length === 0" class="text-center py-8">
          <i class="fas fa-car text-4xl text-slate-400 mb-4"></i>
          <p class="text-slate-600">No vehicles found</p>
        </div>
      </div>

      <!-- Pagination -->
      <div *ngIf="totalVehicles > 0" class="mt-6 flex justify-between items-center">
        <p class="text-sm text-slate-600">Showing {{ vehicles.length }} of {{ totalVehicles }} vehicles</p>
        <div class="flex gap-2">
          <button 
            (click)="previousPage()"
            [disabled]="currentPage === 1"
            class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span class="px-4 py-2 text-slate-600">Page {{ currentPage }}</span>
          <button 
            (click)="nextPage()"
            [disabled]="!hasMore"
            class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
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
    const params = { limit: this.limit.toString(), offset: offset.toString() };

    if (this.searchTerm) {
      (params as any).search = this.searchTerm;
    }
    if (this.statusFilter) {
      (params as any).status = this.statusFilter;
    }

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
        this.feedback.errorToast('Failed to load vehicles', 'Error');
      },
    });
  }

  loadStatistics(): void {
    this.http.get(`${API_CONFIG.baseUrl}/vehicles/stats`).subscribe({
      next: (stats: any) => {
        this.stats = stats;
      },
      error: () => {
        this.feedback.errorToast('Failed to load statistics', 'Error');
      },
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadVehicles();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadVehicles();
  }

  nextPage(): void {
    if (this.hasMore) {
      this.currentPage++;
      this.loadVehicles();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadVehicles();
    }
  }

  openAddVehicleDialog(): void {
    this.feedback.infoToast('Add vehicle feature coming soon', 'Info');
  }
}
