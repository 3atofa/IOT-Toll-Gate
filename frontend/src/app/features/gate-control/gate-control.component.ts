import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/config/api.config';
import { Subscription } from 'rxjs';
import { RealtimeService } from '../../core/services/realtime.service';
import { FeedbackService } from '../../core/services/feedback.service';

interface Gate {
  id: string;
  gateId: string;
  gateNumber: number;
  location: string;
  status: 'open' | 'closed' | 'error';
  isActive: boolean;
  lastCommand: string;
  lastCommandAt: string;
  commandedBy: string;
}

@Component({
  selector: 'app-gate-control',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-800 mb-2">Gate Control</h1>
        <p class="text-slate-600">Manage and monitor gate operations</p>
      </div>

      <!-- Gates Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8" *ngIf="gates.length > 0">
        <div *ngFor="let gate of gates" class="bg-white rounded-lg shadow-md p-6 border-l-4" 
             [ngClass]="gate.status === 'open' ? 'border-green-500' : 'border-red-500'">
          
          <!-- Gate Header -->
          <div class="flex justify-between items-start mb-6">
            <div>
              <h2 class="text-2xl font-bold text-slate-800">{{ gate.location }}</h2>
              <p class="text-sm text-slate-500">Gate #{{ gate.gateNumber }} ({{ gate.gateId }})</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium" [ngClass]="gate.status === 'open' ? 'text-green-600' : 'text-red-600'">
                <span [ngClass]="gate.status === 'open' ? 'fas fa-lock-open' : 'fas fa-lock'"></span>
                {{ gate.status | uppercase }}
              </p>
              <p class="text-xs text-slate-500 mt-1">{{ gate.lastCommandAt | date:'short' }}</p>
            </div>
          </div>

          <!-- Status Indicator -->
          <div class="mb-6 p-4 rounded-lg" [ngClass]="gate.status === 'open' ? 'bg-green-50' : 'bg-red-50'">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium" [ngClass]="gate.status === 'open' ? 'text-green-700' : 'text-red-700'">
                {{ gate.status === 'open' ? 'Gate is Open' : 'Gate is Closed' }}
              </span>
              <span class="text-3xl" [ngClass]="gate.status === 'open' ? 'text-green-500' : 'text-red-500'">
                <i [ngClass]="gate.status === 'open' ? 'fas fa-circle-check' : 'fas fa-circle-xmark'"></i>
              </span>
            </div>
          </div>

          <!-- Last Command Info -->
          <div class="mb-6 bg-slate-50 p-4 rounded-lg text-sm">
            <p class="text-slate-600">
              <strong>Last Command:</strong> {{ gate.lastCommand | uppercase }} by {{ gate.commandedBy }}
            </p>
          </div>

          <!-- Control Buttons -->
          <div class="flex gap-3">
            <button 
              (click)="openGate(gate)"
              [disabled]="gate.status === 'open' || isLoading"
              class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <span *ngIf="!isLoading"><i class="fas fa-lock-open"></i> Open Gate</span>
              <span *ngIf="isLoading"><i class="fas fa-spinner fa-spin"></i> Opening...</span>
            </button>
            <button 
              (click)="closeGate(gate)"
              [disabled]="gate.status === 'closed' || isLoading"
              class="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <span *ngIf="!isLoading"><i class="fas fa-lock"></i> Close Gate</span>
              <span *ngIf="isLoading"><i class="fas fa-spinner fa-spin"></i> Closing...</span>
            </button>
          </div>

          <!-- Active Badge -->
          <div class="mt-4 flex items-center gap-2 text-sm">
            <span [ngClass]="gate.isActive ? 'text-green-600' : 'text-slate-400'">
              <i class="fas" [ngClass]="gate.isActive ? 'fa-check-circle' : 'fa-times-circle'"></i>
            </span>
            <span [ngClass]="gate.isActive ? 'text-green-600' : 'text-slate-400'">
              {{ gate.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading && gates.length === 0" class="flex justify-center items-center h-64">
        <div class="text-center">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
          <p class="text-slate-600">Loading gate information...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && gates.length === 0" class="bg-white rounded-lg shadow-md p-8 text-center">
        <i class="fas fa-info-circle text-4xl text-slate-400 mb-4"></i>
        <p class="text-slate-600">No gates configured</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class GateControlComponent implements OnInit, OnDestroy {
  gates: Gate[] = [];
  isLoading = false;
  private subscriptions = new Subscription();

  constructor(
    private http: HttpClient,
    private realtime: RealtimeService,
    private feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadGates();
    
    // Listen for gate status changes
    const statusSub = this.realtime.onGateStatusChanged().subscribe({
      next: (data: { gateId: string; status: 'open' | 'closed' | 'error' }) => {
        const gateIndex = this.gates.findIndex(g => g.id === data.gateId);
        if (gateIndex !== -1) {
          this.gates[gateIndex].status = data.status;
          this.gates[gateIndex].lastCommandAt = new Date().toISOString();
        }
      },
    });
    this.subscriptions.add(statusSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadGates(): void {
    this.isLoading = true;
    this.http.get<Gate[]>(`${API_CONFIG.baseUrl}/gates`).subscribe({
      next: (gates) => {
        this.gates = gates;
        this.isLoading = false;
      },
      error: (err) => {
        this.feedback.errorToast('Failed to load gates', 'Error');
        this.isLoading = false;
      },
    });
  }

  openGate(gate: Gate): void {
    this.isLoading = true;
    this.http.post(`${API_CONFIG.baseUrl}/gates/${gate.id}/open`, {
      commandedBy: 'admin-user',
    }).subscribe({
      next: (response: any) => {
        gate.status = 'open';
        gate.lastCommandAt = new Date().toISOString();
        this.feedback.successToast('Gate opened successfully', 'Success');
        this.isLoading = false;
      },
      error: (err) => {
        this.feedback.errorToast('Failed to open gate', 'Error');
        this.isLoading = false;
      },
    });
  }

  closeGate(gate: Gate): void {
    this.isLoading = true;
    this.http.post(`${API_CONFIG.baseUrl}/gates/${gate.id}/close`, {
      commandedBy: 'admin-user',
    }).subscribe({
      next: (response: any) => {
        gate.status = 'closed';
        gate.lastCommandAt = new Date().toISOString();
        this.feedback.successToast('Gate closed successfully', 'Success');
        this.isLoading = false;
      },
      error: (err) => {
        this.feedback.errorToast('Failed to close gate', 'Error');
        this.isLoading = false;
      },
    });
  }
}
