import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/config/api.config';
import { Subscription } from 'rxjs';
import { RealtimeService } from '../../core/services/realtime.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { CaptureApiService } from '../../core/services/capture-api.service';
import { GateCapture } from '../../core/models/gate-capture.model';

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

interface GateCreatedResponse extends Gate { token: string; }
interface RegenerateTokenResponse { message: string; gateId: string; token: string; }

@Component({
  selector: 'app-gate-control',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TranslatePipe],
  templateUrl: './gate-control.component.html',
  styles: [`:host { display: block; }`],
})
export class GateControlComponent implements OnInit, OnDestroy {
  // ── Gates list ────────────────────────────────────────────────────
  gates: Gate[] = [];
  isLoading = false;
  actionGateId: string | null = null;
  actionLabel: 'open' | 'close' | null = null;

  // ── Add gate modal ────────────────────────────────────────────────
  showAddModal = false;
  addingSaving = false;
  addForm: { gateNumber: number | null; location: string; notes: string } = {
    gateNumber: null, location: '', notes: '',
  };

  // ── Token modal ───────────────────────────────────────────────────
  showTokenModal = false;
  displayedToken: { token: string; gateId: string; location: string } | null = null;
  tokenCopied = false;

  // ── Gate details panel ────────────────────────────────────────────
  selectedGate: Gate | null = null;
  showDetails = false;
  detailsLoading = false;
  gateCaptures: GateCapture[] = [];
  detailsTotal = 0;

  // Detail lightbox
  detailSelectedCapture: GateCapture | null = null;
  detailLightboxOpen = false;

  readonly i18n = inject(I18nService);
  private subscriptions = new Subscription();

  constructor(
    private readonly http: HttpClient,
    private readonly realtime: RealtimeService,
    private readonly feedback: FeedbackService,
    private readonly captureApi: CaptureApiService,
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
            if (this.selectedGate && String(this.selectedGate.id) === String(data.gateId)) {
              this.selectedGate = { ...this.gates[idx] };
            }
          }
        },
      }),
    );
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.detailLightboxOpen) { this.detailLightboxOpen = false; return; }
    if (this.showDetails) { this.closeDetails(); return; }
    if (this.showTokenModal) { this.closeTokenModal(); return; }
    if (this.showAddModal) { this.closeAddModal(); }
  }

  // ── Load gates ────────────────────────────────────────────────────
  loadGates(): void {
    this.isLoading = true;
    this.http.get<Gate[]>(`${API_CONFIG.baseUrl}/gates`).subscribe({
      next: (gates) => { this.gates = gates; this.isLoading = false; },
      error: () => { this.feedback.errorToast(this.i18n.t('gate.loadFailed')); this.isLoading = false; },
    });
  }

  // ── Gate details ──────────────────────────────────────────────────
  openDetails(gate: Gate): void {
    this.selectedGate = gate;
    this.showDetails = true;
    this.gateCaptures = [];
    this.detailsTotal = 0;
    this.detailLightboxOpen = false;
    this.detailSelectedCapture = null;
    this.loadGateCaptures(gate.gateId);
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedGate = null;
    this.gateCaptures = [];
    this.detailLightboxOpen = false;
    this.detailSelectedCapture = null;
  }

  loadGateCaptures(gateId: string): void {
    this.detailsLoading = true;
    this.captureApi.getCapturesForGate(gateId, 100, 0).subscribe({
      next: (res) => { this.gateCaptures = res.items; this.detailsTotal = res.total; this.detailsLoading = false; },
      error: () => { this.detailsLoading = false; this.feedback.errorToast('Failed to load captures'); },
    });
  }

  // Detail lightbox
  openDetailLightbox(capture: GateCapture): void {
    this.detailSelectedCapture = capture;
    this.detailLightboxOpen = true;
  }
  closeDetailLightbox(): void { this.detailLightboxOpen = false; }

  // Download image
  downloadImage(capture: GateCapture): void {
    const url = this.displayImageUrl(capture.imagePath);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `capture_${capture.id}_${capture.capturedAt.slice(0, 10)}.jpg`;
    a.target = '_blank';
    a.click();
  }

  // ── Computed stats for details panel ─────────────────────────────
  get todayCapturesCount(): number {
    const today = new Date().toDateString();
    return this.gateCaptures.filter(c => new Date(c.capturedAt).toDateString() === today).length;
  }

  get allowedCount(): number {
    return this.gateCaptures.filter(c => c.securityDecision === 'allow').length;
  }

  get blockedCount(): number {
    return this.gateCaptures.filter(c => c.securityDecision === 'block').length;
  }

  // ── Helpers ───────────────────────────────────────────────────────
  displayImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('/')) return `${window.location.origin}${imagePath}`;
    if (window.location.protocol === 'https:' && imagePath.startsWith('http://'))
      return imagePath.replace(/^http:\/\//i, 'https://');
    return imagePath;
  }

  ocrStatusClass(status: GateCapture['ocrStatus']): string {
    switch (status) {
      case 'done':            return 'tg-badge-green';
      case 'review_required': return 'tg-badge-amber';
      case 'failed':          return 'tg-badge-red';
      case 'processing':      return 'tg-badge-blue';
      default:                return 'tg-badge-slate';
    }
  }

  secDecisionClass(d: GateCapture['securityDecision']): string {
    if (d === 'block')  return 'tg-badge-red';
    if (d === 'review') return 'tg-badge-amber';
    return 'tg-badge-green';
  }

  // ── Add gate ──────────────────────────────────────────────────────
  openAddModal(): void {
    this.addForm = { gateNumber: null, location: '', notes: '' };
    this.showAddModal = true;
  }
  closeAddModal(): void { this.showAddModal = false; }

  submitAddGate(): void {
    const gateNumber = Number(this.addForm.gateNumber);
    const location = (this.addForm.location || '').trim();
    if (!gateNumber || gateNumber < 1) { this.feedback.errorToast(this.i18n.t('gate.numberRequired')); return; }
    if (!location) { this.feedback.errorToast(this.i18n.t('gate.locationRequired')); return; }
    this.addingSaving = true;
    this.http.post<GateCreatedResponse>(`${API_CONFIG.baseUrl}/gates`, {
      gateNumber, gateId: `gate-${gateNumber}`, location, notes: this.addForm.notes || undefined,
    }).subscribe({
      next: (created) => {
        this.addingSaving = false;
        this.closeAddModal();
        this.feedback.successToast(this.i18n.t('gate.addSuccess'));
        this.loadGates();
        this.displayedToken = { token: created.token, gateId: created.gateId, location: created.location };
        this.tokenCopied = false;
        this.showTokenModal = true;
      },
      error: () => { this.addingSaving = false; this.feedback.errorToast(this.i18n.t('gate.addFailed')); },
    });
  }

  // ── Regenerate token ──────────────────────────────────────────────
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

  copyToken(): void {
    if (!this.displayedToken?.token) return;
    navigator.clipboard.writeText(this.displayedToken.token).then(() => {
      this.tokenCopied = true;
      setTimeout(() => { this.tokenCopied = false; }, 2500);
    });
  }
  closeTokenModal(): void { this.showTokenModal = false; this.displayedToken = null; }

  // ── Gate open / close ─────────────────────────────────────────────
  openGate(gate: Gate): void {
    this.actionGateId = gate.id; this.actionLabel = 'open';
    this.http.put(`${API_CONFIG.baseUrl}/gates/${gate.id}`, { status: 'open', commandedBy: 'web-operator' }).subscribe({
      next: () => {
        gate.status = 'open'; gate.lastCommand = 'open'; gate.lastCommandAt = new Date().toISOString();
        if (this.selectedGate?.id === gate.id) this.selectedGate = { ...gate };
        this.feedback.successToast(this.i18n.t('gate.openedSuccess'));
        this.actionGateId = null; this.actionLabel = null;
      },
      error: () => { this.feedback.errorToast(this.i18n.t('gate.openFailed')); this.actionGateId = null; this.actionLabel = null; },
    });
  }

  closeGate(gate: Gate): void {
    this.actionGateId = gate.id; this.actionLabel = 'close';
    this.http.put(`${API_CONFIG.baseUrl}/gates/${gate.id}`, { status: 'closed', commandedBy: 'web-operator' }).subscribe({
      next: () => {
        gate.status = 'closed'; gate.lastCommand = 'close'; gate.lastCommandAt = new Date().toISOString();
        if (this.selectedGate?.id === gate.id) this.selectedGate = { ...gate };
        this.feedback.successToast(this.i18n.t('gate.closedSuccess'));
        this.actionGateId = null; this.actionLabel = null;
      },
      error: () => { this.feedback.errorToast(this.i18n.t('gate.closeFailed')); this.actionGateId = null; this.actionLabel = null; },
    });
  }
}