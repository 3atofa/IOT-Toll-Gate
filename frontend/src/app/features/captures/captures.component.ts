import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CaptureApiService } from '../../core/services/capture-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { GateCapture } from '../../core/models/gate-capture.model';

@Component({
  selector: 'app-captures',
  imports: [CommonModule, DatePipe, TranslatePipe],
  templateUrl: './captures.component.html',
  styleUrl: './captures.component.css',
})
export class CapturesComponent implements OnInit {
  captures: GateCapture[] = [];
  loading = true;

  // Modal state
  selectedCapture: GateCapture | null = null;
  showModal = false;
  lightboxOpen = false;

  readonly i18n = inject(I18nService);

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
    this.captureApi.getCaptures(100, 0).subscribe({
      next: (response) => { this.captures = response.items; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast(this.i18n.t('captures.loadFailed')); },
    });
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

  // ── Helpers ────────────────────────────────────────────────────────
  displayImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('/')) return `${window.location.origin}${imagePath}`;
    if (window.location.protocol === 'https:' && imagePath.startsWith('http://'))
      return imagePath.replace(/^http:\/\//i, 'https://');
    return imagePath;
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
}

