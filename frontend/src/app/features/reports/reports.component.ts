import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportApiService } from '../../core/services/report-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { ReportSummary, TrafficReport, SecurityReport, AlprReport, FinancialReport, IncidentsReport } from '../../core/models/report.model';

type TabId = 'summary' | 'traffic' | 'security' | 'alpr' | 'financial' | 'incidents';

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

  showPdfMenu = false;
  pdfLang: 'en' | 'ar' = 'en';
  readonly pdfTypes: { type: 'summary' | 'traffic' | 'security' | 'alpr' | 'full'; label: string; icon: string }[] = [
    { type: 'summary',  label: 'Summary Report',     icon: 'fa-chart-pie'     },
    { type: 'traffic',  label: 'Traffic Report',      icon: 'fa-chart-bar'     },
    { type: 'security', label: 'Security Report',     icon: 'fa-shield-halved' },
    { type: 'alpr',     label: 'ALPR / OCR Report',  icon: 'fa-camera'        },
    { type: 'full',     label: 'Full Report (All)',   icon: 'fa-file-pdf'      },
  ];

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

  // On init: only load the active (summary) tab — others load on demand
  ngOnInit(): void { this.loadSummary(); }

  setTab(tab: TabId): void {
    this.activeTab = tab;
    this.loadTab(tab);
  }

  // Reload all with cleared data (called by Apply Filters)
  loadAll(): void {
    this.summary   = null; this.traffic   = null;
    this.security  = null; this.alpr      = null;
    this.financial = null; this.incidents = null;
    this.loadSummary();
    this.loadTraffic();
    this.loadSecurity();
    this.loadAlpr();
  }

  // Refresh only the active tab
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

  loadFinancial(): void {
    this.loading = true;
    this.reportApi.getFinancialReport(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.financial = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast('Failed to load financial report'); },
    });
  }

  loadIncidents(): void {
    this.loading = true;
    this.reportApi.getIncidentsReport(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (d) => { this.incidents = d; this.loading = false; },
      error: () => { this.loading = false; this.feedback.errorToast('Failed to load incidents report'); },
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
        this.feedback.successToast('Financial PDF downloaded');
      },
      error: () => this.feedback.errorToast('PDF download failed'),
    });
  }

  downloadIncidentsPdf(): void {
    this.reportApi.downloadIncidentsPdf(this.startDate || undefined, this.endDate || undefined, this.pdfLang).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `gate-incidents-report-${this.today()}-${this.pdfLang}.pdf`; a.click();
        URL.revokeObjectURL(url);
        this.feedback.successToast('Incidents PDF downloaded');
      },
      error: () => this.feedback.errorToast('PDF download failed'),
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

  maxSeverityCount(): number {
    if (!this.incidents) return 1;
    return Math.max(1, ...this.incidents.bySeverity.map(r => +r.count));
  }
}
