import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportApiService } from '../../core/services/report-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { ReportSummary, TrafficReport, SecurityReport, AlprReport } from '../../core/models/report.model';

type TabId = 'summary' | 'traffic' | 'security' | 'alpr';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  activeTab: TabId = 'summary';

  startDate = '';
  endDate   = '';
  gateIdFilter = '';

  loading = false;

  summary:  ReportSummary  | null = null;
  traffic:  TrafficReport  | null = null;
  security: SecurityReport | null = null;
  alpr:     AlprReport     | null = null;

  private readonly reportApi = inject(ReportApiService);
  private readonly feedback  = inject(FeedbackService);

  ngOnInit(): void { this.loadAll(); }

  setTab(tab: TabId): void {
    this.activeTab = tab;
    this.loadTab(tab);
  }

  loadAll(): void {
    this.loadSummary();
    this.loadTraffic();
    this.loadSecurity();
    this.loadAlpr();
  }

  applyFilters(): void { this.loadAll(); }

  private loadTab(tab: TabId): void {
    switch (tab) {
      case 'summary':  if (!this.summary)  this.loadSummary();  break;
      case 'traffic':  if (!this.traffic)  this.loadTraffic();  break;
      case 'security': if (!this.security) this.loadSecurity(); break;
      case 'alpr':     if (!this.alpr)     this.loadAlpr();     break;
    }
  }

  loadSummary(): void {
    this.loading = true;
    this.reportApi.getSummary(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.summary = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast('Failed to load summary'); },
    });
  }

  loadTraffic(): void {
    this.loading = true;
    this.reportApi.getTrafficReport(this.startDate || undefined, this.endDate || undefined, this.gateIdFilter || undefined).subscribe({
      next: (d) => { this.traffic = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast('Failed to load traffic report'); },
    });
  }

  loadSecurity(): void {
    this.loading = true;
    this.reportApi.getSecurityReport(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.security = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast('Failed to load security report'); },
    });
  }

  loadAlpr(): void {
    this.loading = true;
    this.reportApi.getAlprReport(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.alpr = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast('Failed to load ALPR report'); },
    });
  }

  downloadPdf(): void {
    this.reportApi.downloadPdf(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `gate-report-${this.today()}.pdf`; a.click();
        URL.revokeObjectURL(url);
        this.feedback.successToast('PDF downloaded');
      },
      error: () => this.feedback.errorToast('PDF download failed'),
    });
  }

  downloadCsv(type: 'captures' | 'alerts'): void {
    this.reportApi.downloadCsv(type, this.startDate || undefined, this.endDate || undefined, this.gateIdFilter || undefined).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `gate-${type}-${this.today()}.csv`; a.click();
        URL.revokeObjectURL(url);
        this.feedback.successToast('CSV downloaded');
      },
      error: () => this.feedback.errorToast('CSV download failed'),
    });
  }

  private today(): string { return new Date().toISOString().slice(0, 10); }

  // ─── chart helpers ────────────────────────────────────────────────
  maxCount(rows: { count: string }[]): number {
    return Math.max(1, ...rows.map(r => +r.count));
  }

  barWidth(count: string | number, max: number): number {
    return Math.round((+count / max) * 100);
  }

  // gates aggregated from traffic
  get gateList(): string[] {
    if (!this.traffic) return [];
    return [...new Set(this.traffic.byGateEvent.map(r => r.gateId))];
  }

  gateTotal(gateId: string): number {
    return (this.traffic?.byGateEvent ?? [])
      .filter(r => r.gateId === gateId)
      .reduce((s, r) => s + +r.count, 0);
  }

  gateGranted(gateId: string): number {
    return +(this.traffic?.byGateEvent.find(r => r.gateId === gateId && r.eventType === 'access_granted')?.count ?? 0);
  }

  gateDenied(gateId: string): number {
    return +(this.traffic?.byGateEvent.find(r => r.gateId === gateId && r.eventType === 'access_denied')?.count ?? 0);
  }

  // OCR status class
  ocrClass(status: string): string {
    switch (status) {
      case 'done':   return 'tg-badge-green';
      case 'failed': return 'tg-badge-red';
      case 'processing': return 'tg-badge-blue';
      default:       return 'tg-badge-slate';
    }
  }

  // Decision class
  decisionClass(decision?: string | null): string {
    switch (decision) {
      case 'allow':  return 'tg-badge-green';
      case 'block':  return 'tg-badge-red';
      default:       return 'tg-badge-amber';
    }
  }

  alertTypeClass(type: string): string {
    switch (type) {
      case 'wanted_person': return 'tg-badge-red';
      case 'stolen_car':    return 'tg-badge-red';
      case 'plate_review':  return 'tg-badge-amber';
      case 'face_review':   return 'tg-badge-amber';
      default:              return 'tg-badge-slate';
    }
  }

  alertTypeLabel(type: string): string {
    switch (type) {
      case 'wanted_person': return 'Wanted Person';
      case 'stolen_car':    return 'Stolen Car';
      case 'plate_review':  return 'Plate Review';
      case 'face_review':   return 'Face Review';
      default:              return type;
    }
  }

  // fill 24 hours ensuring all slots exist
  get hourlyData(): { hour: number; count: number }[] {
    const map = new Map<number, number>();
    (this.traffic?.byHour ?? []).forEach(r => map.set(+r.hour, +r.count));
    return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: map.get(h) ?? 0 }));
  }

  // alpr detection rate
  get plateDetectionRate(): number {
    if (!this.alpr) return 0;
    const total = this.alpr.withPlate + this.alpr.withoutPlate;
    return total === 0 ? 0 : Math.round((this.alpr.withPlate / total) * 100);
  }

  get faceDetectionRate(): number {
    if (!this.alpr) return 0;
    const total = this.alpr.withFace + this.alpr.withoutFace;
    return total === 0 ? 0 : Math.round((this.alpr.withFace / total) * 100);
  }

  get alprTotal(): number {
    if (!this.alpr) return 0;
    return this.alpr.withPlate + this.alpr.withoutPlate;
  }

  get wantedCount(): number {
    return +(this.security?.byType.find(r => r.alertType === 'wanted_person')?.count ?? 0);
  }

  get stolenCount(): number {
    return +(this.security?.byType.find(r => r.alertType === 'stolen_car')?.count ?? 0);
  }
}
