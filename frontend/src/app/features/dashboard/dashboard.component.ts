import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CaptureApiService } from '../../core/services/capture-api.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { GateCapture } from '../../core/models/gate-capture.model';
import { API_CONFIG } from '../../core/config/api.config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  latestCapture: GateCapture | null = null;
  loading = true;
  imageLoadFailed = false;

  readonly i18n = inject(I18nService);
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly captureApi: CaptureApiService,
    private readonly realtime: RealtimeService
  ) {}

  ngOnInit(): void {
    this.fetchLatest();

    const sub = this.realtime.onNewCapture().subscribe({
      next: (capture) => {
        this.latestCapture = capture;
        this.imageLoadFailed = false;
        this.loading = false;
      },
    });
    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private fetchLatest(): void {
    this.loading = true;
    this.captureApi.getLatestCapture().subscribe({
      next: (capture) => {
        this.latestCapture = capture;
        this.imageLoadFailed = false;
        this.loading = false;
      },
      error: () => {
        this.latestCapture = null;
        this.loading = false;
      },
    });
  }

  displayImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    const base = API_CONFIG.baseUrl.replace(/\/api$/, '');
    return `${base}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  }

  onImageError(): void {
    this.imageLoadFailed = true;
  }

  getStatusLabel(eventType: string): string {
    const map: Record<string, string> = {
      access_granted: this.i18n.t('dashboard.event.granted'),
      access_denied: this.i18n.t('dashboard.event.denied'),
      manual_capture: this.i18n.t('dashboard.event.manual'),
      security_check: this.i18n.t('dashboard.event.security'),
    };
    return map[eventType] || eventType;
  }

  ocrStatusTextClass(status?: string): string {
    switch (status) {
      case 'done': return 'text-emerald-700';
      case 'failed': return 'text-red-600';
      case 'review_required': return 'text-amber-600';
      case 'processing': return 'text-blue-600';
      default: return 'text-slate-600';
    }
  }
}
