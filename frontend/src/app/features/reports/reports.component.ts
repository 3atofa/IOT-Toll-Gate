import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportApiService } from '../../core/services/report-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { ReportSummary, TrafficReport, SecurityReport, AlprReport, FinancialReport, IncidentsReport } from '../../core/models/report.model';

type TabId = 'summary' | 'traffic' | 'security' | 'alpr' | 'financial' | 'incidents';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, TranslatePipe],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  readonly i18n = inject(I18nService);

  activeTab: TabId = 'summary';

  startDate = '';
  endDate   = '';
  gateIdFilter = '';

  loading = false;

  showPdfMenu = false;
  pdfLang: 'en' | 'ar' = 'en';

  get pdfTypes(): { type: 'summary' | 'traffic' | 'security' | 'alpr' | 'full'; label: string; icon: string }[] {
    return [
      { type: 'summary',  label: this.i18n.t('reports.pdf.summary'),  icon: 'fa-chart-pie'     },
      { type: 'traffic',  label: this.i18n.t('reports.pdf.traffic'),  icon: 'fa-chart-bar'     },
      { type: 'security', label: this.i18n.t('reports.pdf.security'), icon: 'fa-shield-halved' },
      { type: 'alpr',     label: this.i18n.t('reports.pdf.alpr'),     icon: 'fa-camera'        },
      { type: 'full',     label: this.i18n.t('reports.pdf.full'),     icon: 'fa-file-pdf'      },
    ];
  }

  summary:    ReportSummary    | null = null;
  traffic:    TrafficReport    | null = null;
  security:   SecurityReport   | null = null;
  alpr:       AlprReport       | null = null;
  financial:  FinancialReport  | null = null;
  incidents:  IncidentsReport  | null = null;

  private readonly reportApi = inject(ReportApiService);
  private readonly feedback  = inject(FeedbackService);

  @HostListener('document:click', ['$event.target'])
  onDocClick(target: HTMLElement): void {
    if (this.showPdfMenu && !target.closest?.('.relative')) {
      this.showPdfMenu = false;
    }
  }

  ngOnInit(): void { this.loadSummary(); }

  setTab(tab: TabId): void {
    this.activeTab = tab;
    this.loadTab(tab);
  }

  loadAll(): void {
    this.summary   = null; this.traffic   = null;
    this.security  = null; this.alpr      = null;
    this.financial = null; this.incidents = null;
    this.loadSummary();
    this.loadTraffic();
    this.loadSecurity();
    this.loadAlpr();
  }

  refreshTab(): void {
    switch (this.activeTab) {
      case 'summary':   this.summary   = null; this.loadSummary();    break;
      case 'traffic':   this.traffic   = null; this.loadTraffic();    break;
      case 'security':  this.security  = null; this.loadSecurity();   break;
      case 'alpr':      this.alpr      = null; this.loadAlpr();       break;
      case 'financial': this.financial = null; this.loadFinancial();  break;
      case 'incidents': this.incidents = null; this.loadIncidents();  break;
    }
  }

  applyFilters(): void { this.loadAll(); }

  private loadTab(tab: TabId): void {
    switch (tab) {
      case 'summary':   if (!this.summary)   this.loadSummary();   break;
      case 'traffic':   if (!this.traffic)   this.loadTraffic();   break;
      case 'security':  if (!this.security)  this.loadSecurity();  break;
      case 'alpr':      if (!this.alpr)      this.loadAlpr();      break;
      case 'financial': if (!this.financial) this.loadFinancial(); break;
      case 'incidents': if (!this.incidents) this.loadIncidents(); break;
    }
  }

  loadSummary(): void {
    this.loading = true;
    this.reportApi.getSummary(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.summary = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast(this.i18n.t('reports.loadFailed')); },
    });
  }

  loadTraffic(): void {
    this.loading = true;
    this.reportApi.getTrafficReport(this.startDate || undefined, this.endDate || undefined, this.gateIdFilter || undefined).subscribe({
      next: (d) => { this.traffic = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast(this.i18n.t('reports.loadTrafficFailed')); },
    });
  }

  loadSecurity(): void {
    this.loading = true;
    this.reportApi.getSecurityReport(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.security = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast(this.i18n.t('reports.loadSecurityFailed')); },
    });
  }

  loadAlpr(): void {
    this.loading = true;
    this.reportApi.getAlprReport(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.alpr = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast(this.i18n.t('reports.loadAlprFailed')); },
    });
  }

  loadFinancial(): void {
    this.loading = true;
    this.reportApi.getFinancialReport(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.financial = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast(this.i18n.t('reports.loadFinancialFailed')); },
    });
  }

  loadIncidents(): void {
    this.loading = true;
    this.reportApi.getIncidentsReport(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.incidents = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast(this.i18n.t('reports.loadIncidentsFailed')); },
    });
  }

  togglePdfLang(): void {
    this.pdfLang = this.pdfLang === 'en' ? 'ar' : 'en';
  }

  downloadFinancialPdf(): void {
    this.reportApi.downloadFinancialPdf(this.startDate || undefined, this.endDate || undefined, this.pdfLang).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `gate-financial-report-${this.today()}-${this.pdfLang}.pdf`; a.click();
        URL.revokeObjectURL(url);
        this.feedback.successToast(this.i18n.t('reports.downloadSuccess'));
      },
      error: () => this.feedback.errorToast(this.i18n.t('reports.downloadFailed')),
    });
  }

  downloadIncidentsPdf(): void {
    this.reportApi.downloadIncidentsPdf(this.startDate || undefined, this.endDate || undefined, this.pdfLang).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `gate-incidents-report-${this.today()}-${this.pdfLang}.pdf`; a.click();
        URL.revokeObjectURL(url);
        this.feedback.successToast(this.i18n.t('reports.downloadSuccess'));
      },
      error: () => this.feedback.errorToast(this.i18n.t('reports.downloadFailed')),
    });
  }

  downloadPdf(type: 'summary' | 'traffic' | 'security' | 'alpr' | 'full' = 'summary'): void {
    this.showPdfMenu = false;
    this.reportApi.downloadPdf(type, this.startDate || undefined, this.endDate || undefined, this.pdfLang).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `gate-${type}-report-${this.today()}-${this.pdfLang}.pdf`; a.click();
        URL.revokeObjectURL(url);
        this.feedback.successToast(this.i18n.t('reports.downloadSuccess'));
      },
      error: () => this.feedback.errorToast(this.i18n.t('reports.downloadFailed')),
    });
  }

  downloadCsv(type: 'captures' | 'alerts'): void {
    this.reportApi.downloadCsv(type, this.startDate || undefined, this.endDate || undefined, this.gateIdFilter || undefined).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `gate-${type}-${this.today()}.csv`; a.click();
        URL.revokeObjectURL(url);
        this.feedback.successToast(this.i18n.t('reports.csvSuccess'));
      },
      error: () => this.feedback.errorToast(this.i18n.t('reports.downloadFailed')),
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

  // ─── Financial helpers ────────────────────────────────────────────
  get netPnLPositive(): boolean { return (this.financial?.netPnL ?? 0) >= 0; }

  incidentsSeverityCount(sev: string): number {
    return +(this.incidents?.bySeverity.find(r => r.severity === sev)?.count ?? 0);
  }

  severityBarClass(sev: string): string {
    const map: Record<string, string> = {
      low: 'bg-blue-400', medium: 'bg-amber-400', high: 'bg-orange-500', critical: 'bg-red-600',
    };
    return map[sev] ?? 'bg-slate-400';
  }

  severityLabel(sev: string): string {
    const map: Record<string, string> = {
      low: 'incidents.sev.low', medium: 'incidents.sev.medium',
      high: 'incidents.sev.high', critical: 'incidents.sev.critical',
    };
    return this.i18n.t(map[sev] ?? sev);
  }

  maxSeverityCount(): number {
    if (!this.incidents) return 1;
    return Math.max(1, ...this.incidents.bySeverity.map(r => +r.count));
  }

  get grantRate(): number {
    const t = this.summary?.totals;
    if (!t || !t.totalCaptures) return 0;
    return Math.round((t.accessGranted / t.totalCaptures) * 100);
  }

  get wantedCount(): number {
    return +(this.security?.byType.find(r => r.alertType === 'wanted_person')?.count ?? 0);
  }

  get stolenCount(): number {
    return +(this.security?.byType.find(r => r.alertType === 'stolen_car')?.count ?? 0);
  }

  get alertResolutionRate(): number {
    const alerts = this.security?.recentAlerts ?? [];
    if (!alerts.length) return 0;
    const resolved = alerts.filter((a: any) => a.resolvedAt).length;
    return Math.round((resolved / alerts.length) * 100);
  }

  decisionClass(decision: string | undefined): string {
    const map: Record<string, string> = {
      block:  'tg-badge-red',
      allow:  'tg-badge-green',
      review: 'tg-badge-amber',
    };
    return map[decision ?? ''] ?? 'tg-badge-blue';
  }

  alertTypeLabel(alertType: string | undefined): string {
    const key = `reports.alert.${alertType ?? ''}`;
    const translated = this.i18n.t(key);
    return translated !== key ? translated : ((alertType ?? '').replace(/_/g, ' ') || this.i18n.t('reports.alert.unknown'));
  }

  alertTypeClass(alertType: string | undefined): string {
    const danger = ['wanted_person', 'stolen_car', 'blacklist'];
    const warn   = ['suspicious', 'overstay'];
    if (danger.includes(alertType ?? '')) return 'tg-badge-red';
    if (warn.includes(alertType ?? ''))   return 'tg-badge-amber';
    return 'tg-badge-blue';
  }

  get alprTotal(): number {
    return (this.alpr?.withPlate ?? 0) + (this.alpr?.withoutPlate ?? 0);
  }

  get plateDetectionRate(): number {
    if (!this.alprTotal) return 0;
    return Math.round(((this.alpr?.withPlate ?? 0) / this.alprTotal) * 100);
  }

  get faceDetectionRate(): number {
    if (!this.alprTotal) return 0;
    return Math.round(((this.alpr?.withFace ?? 0) / this.alprTotal) * 100);
  }

  ocrClass(status: string | undefined): string {
    const map: Record<string, string> = {
      done:       'tg-badge-green',
      failed:     'tg-badge-red',
      processing: 'tg-badge-blue',
      pending:    'tg-badge-amber',
    };
    return map[status ?? ''] ?? 'tg-badge-blue';
  }

  get hourlyData(): { hour: number; count: number }[] {
    const raw = this.traffic?.byHour ?? [];
    const map = new Map(raw.map(r => [+r.hour, +r.count]));
    return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: map.get(i) ?? 0 }));
  }

  donutArc(pct: number): string {
    const clamped = Math.max(0, Math.min(100, pct ?? 0));
    return clamped + ' ' + (100 - clamped);
  }

  financialPeriodLabel(): string {
    const f = this.financial;
    if (!f) return '';
    const from = f.dateRange.startDate
      ? new Date(f.dateRange.startDate).toLocaleDateString(this.i18n.lang() === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : this.i18n.t('reports.financial.allTime');
    const to = f.dateRange.endDate
      ? new Date(f.dateRange.endDate).toLocaleDateString(this.i18n.lang() === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : this.i18n.t('reports.financial.allTime');
    const mo = f.dateRange.months;
    const moLabel = mo === 1 ? this.i18n.t('reports.financial.month') : this.i18n.t('reports.financial.months');
    return `${from} → ${to} (${mo} ${moLabel})`;
  }
}
