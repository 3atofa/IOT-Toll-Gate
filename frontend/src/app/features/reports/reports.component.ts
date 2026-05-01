import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportApiService } from '../../core/services/report-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { ReportSummary } from '../../core/models/report.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TranslatePipe],
  template: `
    <div class="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 bg-slate-50 min-h-full">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs sm:text-sm font-semibold text-indigo-600 uppercase tracking-[0.25em]">{{ 'reports.label' | t }}</p>
          <h1 class="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{{ 'reports.title' | t }}</h1>
          <p class="text-slate-600 mt-2 max-w-3xl text-sm sm:text-base">{{ 'reports.subtitle' | t }}</p>
        </div>
        <button
          type="button"
          (click)="downloadPdf()"
          class="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 text-sm sm:text-base"
        >
          <i class="fas fa-file-pdf"></i>
          <span>{{ 'reports.downloadPdf' | t }}</span>
        </button>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">{{ 'reports.startDate' | t }}</label>
          <input [(ngModel)]="startDate" type="date" class="w-full rounded-xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">{{ 'reports.endDate' | t }}</label>
          <input [(ngModel)]="endDate" type="date" class="w-full rounded-xl border border-slate-300 px-4 py-3" />
        </div>
        <div class="flex items-end sm:col-span-2 md:col-span-1">
          <button
            type="button"
            (click)="loadSummary()"
            class="w-full rounded-xl bg-slate-900 text-white font-semibold py-3 hover:bg-slate-800 transition"
          >
            {{ 'reports.refreshSummary' | t }}
          </button>
        </div>
      </div>

      <div *ngIf="summary" class="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-slate-500 text-xs sm:text-sm">{{ 'reports.totalCaptures' | t }}</p>
          <p class="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{{ summary.totals.totalCaptures }}</p>
        </div>
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-slate-500 text-xs sm:text-sm">{{ 'reports.accessGranted' | t }}</p>
          <p class="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">{{ summary.totals.accessGranted }}</p>
        </div>
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-slate-500 text-xs sm:text-sm">{{ 'reports.securityAlerts' | t }}</p>
          <p class="text-2xl sm:text-3xl font-black text-amber-600 mt-2">{{ summary.totals.totalAlerts }}</p>
        </div>
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-slate-500 text-xs sm:text-sm">{{ 'reports.authorizedCards' | t }}</p>
          <p class="text-2xl sm:text-3xl font-black text-blue-600 mt-2">{{ summary.totals.totalCards }}</p>
        </div>
      </div>

      <div class="grid xl:grid-cols-2 gap-4 sm:gap-6">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 sm:p-5 border-b border-slate-200">
            <h2 class="text-base sm:text-lg font-bold text-slate-900">{{ 'reports.recentCaptures' | t }}</h2>
          </div>
          <div class="divide-y divide-slate-100">
            <div *ngFor="let capture of summary?.recentCaptures || []" class="p-4 flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="font-semibold text-slate-900 truncate">{{ capture.plateText || ('reports.unknownPlate' | t) }}</p>
                <p class="text-xs sm:text-sm text-slate-500 truncate">{{ capture.capturedAt | date:'medium' }} • {{ capture.eventType }}</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-semibold shrink-0" [ngClass]="decisionClass(capture.securityDecision)">
                {{ capture.securityDecision }}
              </span>
            </div>
            <div *ngIf="!(summary?.recentCaptures?.length)" class="p-4 text-slate-500 text-sm">{{ 'reports.noCaptures' | t }}</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 sm:p-5 border-b border-slate-200">
            <h2 class="text-base sm:text-lg font-bold text-slate-900">{{ 'reports.recentAlerts' | t }}</h2>
          </div>
          <div class="divide-y divide-slate-100">
            <div *ngFor="let alert of summary?.recentAlerts || []" class="p-4">
              <p class="font-semibold text-slate-900">{{ alert.alertType }}</p>
              <p class="text-sm text-slate-500">{{ alert.reason }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ alert.createdAt | date:'medium' }}</p>
            </div>
            <div *ngIf="!(summary?.recentAlerts?.length)" class="p-4 text-slate-500 text-sm">{{ 'reports.noAlerts' | t }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  summary: ReportSummary | null = null;
  loading = false;
  startDate = '';
  endDate = '';

  readonly i18n = inject(I18nService);

  constructor(
    private readonly reportApi: ReportApiService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    this.reportApi.getSummary(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.feedback.errorToast(this.i18n.t('reports.loadFailed'));
      },
    });
  }

  downloadPdf(): void {
    this.reportApi.downloadPdf(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `toll-gate-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.feedback.successToast(this.i18n.t('reports.downloadSuccess'));
      },
      error: () => {
        this.feedback.errorToast(this.i18n.t('reports.downloadFailed'));
      },
    });
  }

  decisionClass(decision?: string | null): string {
    switch (decision) {
      case 'allow':
        return 'bg-emerald-100 text-emerald-800';
      case 'block':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  }
}
