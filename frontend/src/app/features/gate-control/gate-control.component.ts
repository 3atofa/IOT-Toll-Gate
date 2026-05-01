import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/config/api.config';
import { Subscription } from 'rxjs';
import { RealtimeService } from '../../core/services/realtime.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

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
  notes?: string;
}

/** Shape returned by POST /gates — includes the one-time token */
interface GateCreatedResponse extends Gate {
  token: string;
}

/** Shape returned by POST /gates/:id/regenerate-token */
interface RegenerateTokenResponse {
  message: string;
  gateId: string;
  token: string;
}

@Component({
  selector: 'app-gate-control',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="p-3 sm:p-4 md:p-8">
      <!-- Header -->
      <div class="mb-4 sm:mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">{{ 'gate.title' | t }}</h1>
          <p class="text-sm sm:text-base text-slate-600">{{ 'gate.subtitle' | t }}</p>
        </div>
        <button type="button" (click)="openAddModal()"
          class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
          <i class="fa-solid fa-plus"></i>
          <span>{{ 'gate.addGate' | t }}</span>
        </button>
      </div>

      <!-- Gate cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8" *ngIf="gates.length > 0">
        <div *ngFor="let gate of gates"
          class="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4"
          [ngClass]="gate.status === 'open' ? 'border-green-500' : 'border-red-500'">

          <div class="flex flex-wrap justify-between items-start gap-3 mb-4">
            <div class="min-w-0">
              <h2 class="text-xl sm:text-2xl font-bold text-slate-800 truncate">{{ gate.location }}</h2>
              <p class="text-sm text-slate-500">{{ 'gate.gateNumber' | t }} #{{ gate.gateNumber }} ({{ gate.gateId }})</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-medium" [ngClass]="gate.status === 'open' ? 'text-green-600' : 'text-red-600'">
                <i [ngClass]="gate.status === 'open' ? 'fas fa-lock-open' : 'fas fa-lock'"></i>
                {{ gate.status | uppercase }}
              </p>
              <p class="text-xs text-slate-500 mt-1">{{ gate.lastCommandAt | date:'short' }}</p>
            </div>
          </div>

          <div class="mb-4 p-3 sm:p-4 rounded-lg" [ngClass]="gate.status === 'open' ? 'bg-green-50' : 'bg-red-50'">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium" [ngClass]="gate.status === 'open' ? 'text-green-700' : 'text-red-700'">
                {{ gate.status === 'open' ? ('gate.isOpen' | t) : ('gate.isClosed' | t) }}
              </span>
              <i class="text-2xl" [ngClass]="gate.status === 'open' ? 'fas fa-circle-check text-green-500' : 'fas fa-circle-xmark text-red-500'"></i>
            </div>
          </div>

          <div class="mb-4 bg-slate-50 p-3 rounded-lg text-sm text-slate-600 break-words">
            <strong>{{ 'gate.lastCommand' | t }}:</strong> {{ gate.lastCommand | uppercase }} {{ 'gate.by' | t }} {{ gate.commandedBy }}
          </div>

          <!-- Open / Close buttons -->
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
            <button type="button" (click)="openGate(gate)"
              [disabled]="gate.status === 'open' || actionGateId === gate.id"
              class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2">
              <ng-container *ngIf="actionGateId !== gate.id || actionLabel !== 'open'">
                <i class="fas fa-lock-open"></i> {{ 'gate.open' | t }}
              </ng-container>
              <ng-container *ngIf="actionGateId === gate.id && actionLabel === 'open'">
                <i class="fas fa-spinner fa-spin"></i> {{ 'gate.opening' | t }}
              </ng-container>
            </button>
            <button type="button" (click)="closeGate(gate)"
              [disabled]="gate.status === 'closed' || actionGateId === gate.id"
              class="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2">
              <ng-container *ngIf="actionGateId !== gate.id || actionLabel !== 'close'">
                <i class="fas fa-lock"></i> {{ 'gate.close' | t }}
              </ng-container>
              <ng-container *ngIf="actionGateId === gate.id && actionLabel === 'close'">
                <i class="fas fa-spinner fa-spin"></i> {{ 'gate.closing' | t }}
              </ng-container>
            </button>
          </div>

          <!-- Regenerate token button -->
          <button type="button" (click)="regenerateToken(gate)"
            class="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 flex items-center justify-center gap-2">
            <i class="fa-solid fa-rotate-right"></i>
            {{ 'gate.regenerate' | t }}
          </button>

          <div class="mt-3 flex items-center gap-2 text-sm"
            [ngClass]="gate.isActive ? 'text-green-600' : 'text-slate-400'">
            <i class="fas" [ngClass]="gate.isActive ? 'fa-check-circle' : 'fa-times-circle'"></i>
            {{ gate.isActive ? ('common.active' | t) : ('common.inactive' | t) }}
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading && gates.length === 0" class="flex justify-center items-center h-64">
        <div class="text-center">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
          <p class="text-slate-600">{{ 'gate.loading' | t }}</p>
        </div>
      </div>

      <!-- Empty -->
      <div *ngIf="!isLoading && gates.length === 0" class="bg-white rounded-xl shadow-md p-6 sm:p-8 text-center">
        <i class="fas fa-circle-info text-4xl text-slate-400 mb-4"></i>
        <p class="text-slate-600 mb-4">{{ 'gate.empty' | t }}</p>
        <button type="button" (click)="openAddModal()"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white font-medium">
          <i class="fa-solid fa-plus"></i>
          {{ 'gate.addGate' | t }}
        </button>
      </div>
    </div>

    <!-- ── ADD GATE MODAL ─────────────────────────────────────────── -->
    <div *ngIf="showAddModal" class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
      <div class="w-full max-w-lg rounded-2xl bg-white p-4 sm:p-6 shadow-xl my-auto">
        <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ 'gate.addGateTitle' | t }}</h2>
        <p class="mt-1 text-sm text-slate-600">{{ 'gate.addGateSubtitle' | t }}</p>

        <form class="mt-5 space-y-4" (ngSubmit)="submitAddGate()">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'gate.gateNumberLabel' | t }}</label>
              <input type="number" name="gateNumber" [(ngModel)]="addForm.gateNumber" required min="1"
                placeholder="1"
                class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'gate.gateIdLabel' | t }}</label>
              <input type="text" name="gateId" [value]="'gate-' + (addForm.gateNumber || '')" disabled
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 outline-none" />
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'gate.locationLabel' | t }}</label>
            <input type="text" name="location" [(ngModel)]="addForm.location" required
              [placeholder]="'gate.locationPlaceholder' | t"
              class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'common.notes' | t }}</label>
            <textarea name="notes" [(ngModel)]="addForm.notes" rows="2"
              [placeholder]="'gate.notesPlaceholder' | t"
              class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"></textarea>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button type="button" (click)="closeAddModal()"
              class="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {{ 'common.cancel' | t }}
            </button>
            <button type="submit" [disabled]="addingSaving"
              class="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400">
              <i *ngIf="addingSaving" class="fas fa-spinner fa-spin me-2"></i>
              {{ addingSaving ? ('common.saving' | t) : ('gate.addGate' | t) }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── TOKEN DISPLAY MODAL ────────────────────────────────────── -->
    <div *ngIf="showTokenModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div class="w-full max-w-lg rounded-2xl bg-white p-4 sm:p-6 shadow-2xl">
        <!-- Warning banner -->
        <div class="mb-4 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-300 p-4">
          <i class="fa-solid fa-triangle-exclamation text-amber-500 text-xl mt-0.5 shrink-0"></i>
          <div>
            <p class="font-bold text-amber-800">{{ 'gate.tokenTitle' | t }}</p>
            <p class="mt-1 text-sm text-amber-700">{{ 'gate.tokenWarning' | t }}</p>
          </div>
        </div>

        <!-- Gate info -->
        <p class="text-sm font-semibold text-slate-700 mb-2">
          {{ displayedToken?.gateId }}
          <span *ngIf="displayedToken?.location" class="font-normal text-slate-500"> — {{ displayedToken?.location }}</span>
        </p>

        <!-- Token box -->
        <div class="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3">
          <code class="flex-1 break-all text-sm font-mono text-slate-800 select-all">{{ displayedToken?.token }}</code>
          <button type="button" (click)="copyToken()"
            class="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition">
            <i class="fa-solid" [ngClass]="tokenCopied ? 'fa-check' : 'fa-copy'"></i>
            {{ tokenCopied ? ('gate.tokenCopied' | t) : ('gate.tokenCopy' | t) }}
          </button>
        </div>

        <!-- Firmware hint -->
        <p class="mt-3 text-xs text-slate-500">
          <i class="fa-solid fa-microchip me-1"></i>{{ 'gate.tokenFirmwareHint' | t }}
        </p>

        <div class="mt-4 flex justify-end">
          <button type="button" (click)="closeTokenModal()"
            class="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {{ 'gate.tokenDone' | t }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class GateControlComponent implements OnInit, OnDestroy {
  gates: Gate[] = [];
  isLoading = false;
  actionGateId: string | null = null;
  actionLabel: 'open' | 'close' | null = null;

  showAddModal = false;
  addingSaving = false;
  addForm: { gateNumber: number | null; location: string; notes: string } = {
    gateNumber: null,
    location: '',
    notes: '',
  };

  showTokenModal = false;
  displayedToken: { token: string; gateId: string; location: string } | null = null;
  tokenCopied = false;

  readonly i18n = inject(I18nService);
  private subscriptions = new Subscription();

  constructor(
    private readonly http: HttpClient,
    private readonly realtime: RealtimeService,
    private readonly feedback: FeedbackService,
  ) {}

  ngOnInit(): void {
    this.loadGates();
    this.subscriptions.add(
      this.realtime.onGateStatusChanged().subscribe({
        next: (data: { gateId: string; status: 'open' | 'closed' | 'error' }) => {
          const idx = this.gates.findIndex(g => String(g.id) === String(data.gateId));
          if (idx !== -1) {
            this.gates[idx].status = data.status;
            this.gates[idx].lastCommandAt = new Date().toISOString();
          }
        },
      }),
    );
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  loadGates(): void {
    this.isLoading = true;
    this.http.get<Gate[]>(`${API_CONFIG.baseUrl}/gates`).subscribe({
      next: (gates) => { this.gates = gates; this.isLoading = false; },
      error: () => { this.feedback.errorToast(this.i18n.t('gate.loadFailed')); this.isLoading = false; },
    });
  }

  // ── ADD GATE ──────────────────────────────────────────────────────

  openAddModal(): void {
    this.addForm = { gateNumber: null, location: '', notes: '' };
    this.showAddModal = true;
  }

  closeAddModal(): void { this.showAddModal = false; }

  submitAddGate(): void {
    const gateNumber = Number(this.addForm.gateNumber);
    const location = (this.addForm.location || '').trim();

    if (!gateNumber || gateNumber < 1) {
      this.feedback.errorToast(this.i18n.t('gate.numberRequired'));
      return;
    }
    if (!location) {
      this.feedback.errorToast(this.i18n.t('gate.locationRequired'));
      return;
    }

    this.addingSaving = true;
    this.http.post<GateCreatedResponse>(`${API_CONFIG.baseUrl}/gates`, {
      gateNumber,
      gateId: `gate-${gateNumber}`,
      location,
      notes: this.addForm.notes || undefined,
    }).subscribe({
      next: (created) => {
        this.addingSaving = false;
        this.closeAddModal();
        this.feedback.successToast(this.i18n.t('gate.addSuccess'));
        this.loadGates();
        // Show one-time token modal
        this.displayedToken = { token: created.token, gateId: created.gateId, location: created.location };
        this.tokenCopied = false;
        this.showTokenModal = true;
      },
      error: () => { this.addingSaving = false; this.feedback.errorToast(this.i18n.t('gate.addFailed')); },
    });
  }

  // ── REGENERATE TOKEN ──────────────────────────────────────────────

  regenerateToken(gate: Gate): void {
    if (!confirm(this.i18n.t('gate.regenerateConfirm'))) return;

    this.http.post<RegenerateTokenResponse>(`${API_CONFIG.baseUrl}/gates/${gate.id}/regenerate-token`, {}).subscribe({
      next: (res) => {
        this.feedback.successToast(this.i18n.t('gate.regenerateSuccess'));
        this.displayedToken = { token: res.token, gateId: res.gateId, location: gate.location };
        this.tokenCopied = false;
        this.showTokenModal = true;
      },
      error: () => this.feedback.errorToast(this.i18n.t('gate.regenerateFailed')),
    });
  }

  // ── TOKEN MODAL ───────────────────────────────────────────────────

  copyToken(): void {
    if (!this.displayedToken?.token) return;
    navigator.clipboard.writeText(this.displayedToken.token).then(() => {
      this.tokenCopied = true;
      setTimeout(() => { this.tokenCopied = false; }, 2500);
    });
  }

  closeTokenModal(): void { this.showTokenModal = false; this.displayedToken = null; }

  // ── GATE OPEN / CLOSE ─────────────────────────────────────────────

  openGate(gate: Gate): void {
    this.actionGateId = gate.id;
    this.actionLabel = 'open';
    this.http.put(`${API_CONFIG.baseUrl}/gates/${gate.id}`, { status: 'open', commandedBy: 'web-operator' }).subscribe({
      next: () => {
        gate.status = 'open';
        gate.lastCommand = 'open';
        gate.lastCommandAt = new Date().toISOString();
        this.feedback.successToast(this.i18n.t('gate.openedSuccess'));
        this.actionGateId = null; this.actionLabel = null;
      },
      error: () => { this.feedback.errorToast(this.i18n.t('gate.openFailed')); this.actionGateId = null; this.actionLabel = null; },
    });
  }

  closeGate(gate: Gate): void {
    this.actionGateId = gate.id;
    this.actionLabel = 'close';
    this.http.put(`${API_CONFIG.baseUrl}/gates/${gate.id}`, { status: 'closed', commandedBy: 'web-operator' }).subscribe({
      next: () => {
        gate.status = 'closed';
        gate.lastCommand = 'close';
        gate.lastCommandAt = new Date().toISOString();
        this.feedback.successToast(this.i18n.t('gate.closedSuccess'));
        this.actionGateId = null; this.actionLabel = null;
      },
      error: () => { this.feedback.errorToast(this.i18n.t('gate.closeFailed')); this.actionGateId = null; this.actionLabel = null; },
    });
  }
}
