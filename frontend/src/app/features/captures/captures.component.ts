import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CaptureApiService } from '../../core/services/capture-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { GateCapture } from '../../core/models/gate-capture.model';

@Component({
  selector: 'app-captures',
  imports: [CommonModule, DatePipe, TranslatePipe, FormsModule],
  templateUrl: './captures.component.html',
  styleUrl: './captures.component.css',
})
export class CapturesComponent implements OnInit {
  captures: GateCapture[] = [];
  loading = true;

  // Pagination
  pageSize = 20;
  currentPage = 1;
  totalCount = 0;

  // Search draft fields (what user is typing — not yet applied)
  draftPlate = '';
  draftEventType = '';
  draftSecurityDecision = '';
  draftGateId = '';
  draftDateFrom = '';
  draftDateTo = '';

  // Applied search (sent to server on last search)
  appliedPlate = '';
  appliedEventType = '';
  appliedSecurityDecision = '';
  appliedGateId = '';
  appliedDateFrom = '';
  appliedDateTo = '';

  // Modal state
  selectedCapture: GateCapture | null = null;
  showModal = false;
  lightboxOpen = false;

  readonly i18n = inject(I18nService);

  readonly eventTypes = ['access_granted', 'access_denied', 'manual_capture', 'security_check'] as const;
  readonly secDecisions = ['allow', 'block', 'review'] as const;

  constructor(
    private readonly captureApi: CaptureApiService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadCaptures();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightboxOpen) { this.lightboxOpen = false; return; }
    if (this.showModal) this.closeModal();
  }

  loadCaptures(): void {
    this.loading = true;
    const offset = (this.currentPage - 1) * this.pageSize;
    this.captureApi.getCaptures({
      limit: this.pageSize,
      offset,
      plate: this.appliedPlate || undefined,
      eventType: this.appliedEventType || undefined,
      securityDecision: this.appliedSecurityDecision || undefined,
      gateId: this.appliedGateId || undefined,
      dateFrom: this.appliedDateFrom || undefined,
      dateTo: this.appliedDateTo || undefined,
    }).subscribe({
      next: (response) => {
        this.captures = response.items;
        this.totalCount = response.total;
        this.loading = false;
      },
      error: () => { this.loading = false; this.feedback.errorToast(this.i18n.t('captures.loadFailed')); },
    });
  }

  applySearch(): void {
    this.appliedPlate = this.draftPlate;
    this.appliedEventType = this.draftEventType;
    this.appliedSecurityDecision = this.draftSecurityDecision;
    this.appliedGateId = this.draftGateId;
    this.appliedDateFrom = this.draftDateFrom;
    this.appliedDateTo = this.draftDateTo;
    this.currentPage = 1;
    this.loadCaptures();
  }

  resetSearch(): void {
    this.draftPlate = '';
    this.draftEventType = '';
    this.draftSecurityDecision = '';
    this.draftGateId = '';
    this.draftDateFrom = '';
    this.draftDateTo = '';
    this.appliedPlate = '';
    this.appliedEventType = '';
    this.appliedSecurityDecision = '';
    this.appliedGateId = '';
    this.appliedDateFrom = '';
    this.appliedDateTo = '';
    this.currentPage = 1;
    this.loadCaptures();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadCaptures();
  }

  // ── Pagination computed ────────────────────────────────────────────
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalCount / this.pageSize)); }
  get pageFrom(): number { return this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get pageTo(): number { return Math.min(this.currentPage * this.pageSize, this.totalCount); }
  get hasActiveSearch(): boolean {
    return !!(this.appliedPlate || this.appliedEventType || this.appliedSecurityDecision ||
              this.appliedGateId || this.appliedDateFrom || this.appliedDateTo);
  }

  /** Visible page numbers array — at most 5 pages centred on currentPage */
  get visiblePages(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const cur = this.currentPage;
    const pages: number[] = [1];
    const start = Math.max(2, cur - 2);
    const end   = Math.min(total - 1, cur + 2);
    if (start > 2) pages.push(-1); // left ellipsis
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(-1); // right ellipsis
    pages.push(total);
    return pages;
  }

  // ── Modal ──────────────────────────────────────────────────────────
  openDetails(capture: GateCapture): void {
    this.selectedCapture = capture;
    this.showModal = true;
    this.lightboxOpen = false;
  }

  closeModal(): void {
    this.showModal = false;
    this.lightboxOpen = false;
    this.selectedCapture = null;
  }

  openLightbox(): void { this.lightboxOpen = true; }
  closeLightbox(): void { this.lightboxOpen = false; }

  // ── Download image ─────────────────────────────────────────────────
  downloadImage(capture: GateCapture): void {
    const url = this.displayImageUrl(capture.imagePath);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `capture_${capture.id}_${capture.capturedAt.slice(0, 10)}.jpg`;
    a.target = '_blank';
    a.click();
  }

  // ── Label helpers ──────────────────────────────────────────────────
  eventLabel(e: string): string {
    const map: Record<string, string> = {
      access_granted: 'captures.event.access_granted',
      access_denied:  'captures.event.access_denied',
      manual_capture: 'captures.event.manual_capture',
      security_check: 'captures.event.security_check',
    };
    return this.i18n.t(map[e] ?? e);
  }

  eventClass(e: string): string {
    if (e === 'access_granted')  return 'bg-emerald-100 text-emerald-700';
    if (e === 'access_denied')   return 'bg-red-100 text-red-700';
    if (e === 'security_check')  return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
  }

  // ── Helpers ────────────────────────────────────────────────────────
  displayImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  }

  ocrStatusClass(status: GateCapture['ocrStatus']): string {
    switch (status) {
      case 'done':             return 'tg-badge-green';
      case 'review_required':  return 'tg-badge-amber';
      case 'failed':           return 'tg-badge-red';
      case 'processing':       return 'tg-badge-blue';
      default:                 return 'tg-badge-slate';
    }
  }

  secDecisionClass(d: GateCapture['securityDecision']): string {
    if (d === 'block')  return 'tg-badge-red';
    if (d === 'review') return 'tg-badge-amber';
    return 'tg-badge-green';
  }

  // ── Egyptian plate helpers ─────────────────────────────────────────
  displayPlate(capture: GateCapture): string {
    const text = capture.plateTextArabic || capture.plateText;
    return text || '—';
  }

  formatPlate(plate: string | null | undefined): string {
    if (!plate) return '—';
    if (/[؀-ۿ]/.test(plate)) return plate;
    if (/^[A-Z]{3}\d{3}$/.test(plate)) return `${plate.slice(0, 3)} ${plate.slice(3)}`;
    const old = plate.match(/^(\d{1,3})([A-Z]{1,3})$/);
    if (old) return `${old[1]} ${old[2]}`;
    const mixed = plate.match(/^([A-Z]{1,2})(\d{3,5})$/);
    if (mixed) return `${mixed[1]} ${mixed[2]}`;
    return plate;
  }

  plateFormatLabel(plate: string | null | undefined): string {
    if (!plate) return '';
    if (/^[A-Z]{3}\d{3}$/.test(plate))    return 'EGY · NEW';
    if (/^\d{1,3}[A-Z]{1,3}$/.test(plate)) return 'EGY · OLD';
    if (/^[A-Z]{1,2}\d{3,5}$/.test(plate)) return 'EGY';
    if (/^\d{4,9}$/.test(plate))            return 'EGY · NUM';
    return 'UNKNOWN';
  }

  confidencePct(c: number | null | undefined): number {
    return c != null ? Math.round(c * 100) : 0;
  }

  confidenceBarClass(c: number | null | undefined): string {
    const p = this.confidencePct(c);
    if (p >= 80) return 'bg-emerald-500';
    if (p >= 60) return 'bg-amber-400';
    return 'bg-red-400';
  }

  confidenceTextClass(c: number | null | undefined): string {
    const p = this.confidencePct(c);
    if (p >= 80) return 'text-emerald-600';
    if (p >= 60) return 'text-amber-500';
    return 'text-red-500';
  }
}
