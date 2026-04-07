import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportApiService } from '../../core/services/report-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { ReportSummary } from '../../core/models/report.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="p-8 space-y-6 bg-slate-50 min-h-full">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-indigo-600 uppercase tracking-[0.25em]">Reports</p>
          <h1 class="text-3xl font-black text-slate-900 mt-1">Toll Transactions & Security Reports</h1>
          <p class="text-slate-600 mt-2 max-w-3xl">
            Generate secure PDF reports and review system activity, alerts, and capture summaries.
          </p>
        </div>
        <button
          type="button"
          (click)="downloadPdf()"
          class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
        >
          <i class="fas fa-file-pdf"></i>
          Download PDF
        </button>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm grid md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">Start date</label>
          <input [(ngModel)]="startDate" type="date" class="w-full rounded-xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">End date</label>
          <input [(ngModel)]="endDate" type="date" class="w-full rounded-xl border border-slate-300 px-4 py-3" />
        </div>
        <div class="flex items-end">
          <button
            type="button"
            (click)="loadSummary()"
            class="w-full rounded-xl bg-slate-900 text-white font-semibold py-3 hover:bg-slate-800 transition"
          >
            Refresh Summary
          </button>
        </div>
      </div>

      <div *ngIf="summary" class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-slate-500 text-sm">Total Captures</p>
          <p class="text-3xl font-black text-slate-900 mt-2">{{ summary.totals.totalCaptures }}</p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-slate-500 text-sm">Access Granted</p>
          <p class="text-3xl font-black text-emerald-600 mt-2">{{ summary.totals.accessGranted }}</p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-slate-500 text-sm">Security Alerts</p>
          <p class="text-3xl font-black text-amber-600 mt-2">{{ summary.totals.totalAlerts }}</p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-slate-500 text-sm">Authorized Cards</p>
          <p class="text-3xl font-black text-blue-600 mt-2">{{ summary.totals.totalCards }}</p>
        </div>
      </div>

      <div class="grid xl:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-200">
            <h2 class="text-lg font-bold text-slate-900">Recent Captures</h2>
          </div>
          <div class="divide-y divide-slate-100">
            <div *ngFor="let capture of summary?.recentCaptures || []" class="p-4 flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-slate-900">{{ capture.plateText || 'Unknown Plate' }}</p>
                <p class="text-sm text-slate-500">{{ capture.capturedAt | date:'medium' }} • {{ capture.eventType }}</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-semibold" [ngClass]="decisionClass(capture.securityDecision)">
                {{ capture.securityDecision }}
              </span>
            </div>
            <div *ngIf="!(summary?.recentCaptures?.length)" class="p-4 text-slate-500 text-sm">No captures available.</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-200">
            <h2 class="text-lg font-bold text-slate-900">Recent Alerts</h2>
          </div>
          <div class="divide-y divide-slate-100">
            <div *ngFor="let alert of summary?.recentAlerts || []" class="p-4">
              <p class="font-semibold text-slate-900">{{ alert.alertType }}</p>
              <p class="text-sm text-slate-500">{{ alert.reason }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ alert.createdAt | date:'medium' }}</p>
            </div>
            <div *ngIf="!(summary?.recentAlerts?.length)" class="p-4 text-slate-500 text-sm">No alerts available.</div>
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
        this.feedback.errorToast('Failed to load report summary.');
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
        this.feedback.successToast('PDF report downloaded successfully.');
      },
      error: () => {
        this.feedback.errorToast('Failed to download PDF report.');
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
