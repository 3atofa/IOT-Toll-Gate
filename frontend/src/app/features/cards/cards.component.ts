import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/config/api.config';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

const MOCK_AMOUNT = 10; // EGP per toll pass

interface GateCapture {
  id: number;
  gateId: string;
  eventType: string;
  cardUid: string | null;
  plateText: string | null;
  securityDecision: string;
  capturedAt: string;
  imagePath: string;
}

interface CapturesResponse {
  total: number;
  items: GateCapture[];
}

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <section class="min-h-full bg-slate-100 p-3 sm:p-5 md:p-8 page-enter">
      <div class="mx-auto max-w-6xl space-y-5">

        <!-- Page header -->
        <div class="tg-card p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-0.5">{{ 'cards.brand' | t }}</p>
              <h1 class="text-xl sm:text-2xl font-black text-slate-900">{{ 'cards.title' | t }}</h1>
              <p class="text-sm text-slate-500 mt-0.5">{{ 'cards.subtitle' | t }}</p>
            </div>
            <button type="button" (click)="loadPayments()"
              class="tg-btn tg-btn-secondary text-sm">
              <i class="fa-solid fa-arrows-rotate text-xs"></i>
              <span>{{ 'common.refresh' | t }}</span>
            </button>
          </div>
        </div>

        <!-- Stat cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Total payments -->
          <div class="tg-stat">
            <div class="tg-stat__icon" style="background:rgba(34,197,94,0.12);color:#4ade80">
              <i class="fas fa-money-bill-wave"></i>
            </div>
            <div>
              <p class="tg-stat__label">{{ 'cards.totalPayments' | t }}</p>
              <p class="tg-stat__value">{{ payments.length }}</p>
            </div>
          </div>
          <!-- Today's payments -->
          <div class="tg-stat">
            <div class="tg-stat__icon" style="background:rgba(59,130,246,0.12);color:#60a5fa">
              <i class="fas fa-calendar-day"></i>
            </div>
            <div>
              <p class="tg-stat__label">{{ 'cards.todayPayments' | t }}</p>
              <p class="tg-stat__value">{{ todayCount }}</p>
            </div>
          </div>
          <!-- Total amount -->
          <div class="tg-stat">
            <div class="tg-stat__icon" style="background:rgba(251,191,36,0.12);color:#fbbf24">
              <i class="fas fa-coins"></i>
            </div>
            <div>
              <p class="tg-stat__label">{{ 'cards.totalAmount' | t }}</p>
              <p class="tg-stat__value">EGP {{ totalAmount | number:'1.2-2' }}</p>
            </div>
          </div>
        </div>

        <!-- Skeleton -->
        <div *ngIf="loading" class="tg-card p-6 space-y-4">
          <div *ngFor="let _ of [1,2,3,4,5]" class="flex gap-4 items-center">
            <div class="skeleton w-12 h-12 rounded-xl flex-shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="skeleton h-3 w-24"></div>
              <div class="skeleton h-3 w-16"></div>
            </div>
            <div class="skeleton h-6 w-20 rounded-full"></div>
            <div class="skeleton h-3 w-28"></div>
          </div>
        </div>

        <!-- Table -->
        <div *ngIf="!loading" class="tg-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="tg-table min-w-[700px]">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ 'cards.date' | t }}</th>
                  <th>{{ 'cards.gate' | t }}</th>
                  <th>{{ 'cards.plate' | t }}</th>
                  <th>{{ 'cards.cardUid' | t }}</th>
                  <th>{{ 'cards.amount' | t }}</th>
                  <th>{{ 'common.status' | t }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of payments; let i = index">
                  <td class="text-slate-400 text-xs font-mono">{{ i + 1 }}</td>
                  <td class="whitespace-nowrap text-slate-600 text-sm">{{ p.capturedAt | date:'MMM d, y, h:mm a' }}</td>
                  <td class="font-mono text-sm font-semibold text-slate-800">{{ p.gateId }}</td>
                  <td>
                    <span *ngIf="p.plateText" class="font-mono font-bold text-slate-900">{{ p.plateText }}</span>
                    <span *ngIf="!p.plateText" class="text-slate-400 text-xs italic">{{ 'common.na' | t }}</span>
                  </td>
                  <td>
                    <span class="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-700">{{ p.cardUid }}</span>
                  </td>
                  <td class="font-bold text-emerald-700">EGP {{ mockAmount | number:'1.2-2' }}</td>
                  <td>
                    <span class="tg-badge tg-badge-green">
                      <i class="fas fa-check-circle text-[10px] me-1"></i>PAID
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty state -->
          <div *ngIf="payments.length === 0" class="py-16 text-center">
            <div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                 style="background: linear-gradient(135deg, rgba(34,197,94,0.12), rgba(59,130,246,0.08))">
              <i class="fas fa-money-bill-wave text-3xl text-slate-400"></i>
            </div>
            <p class="text-slate-500 font-medium">{{ 'cards.empty' | t }}</p>
          </div>
        </div>

      </div>
    </section>
  `,
  styles: [`:host { display: block; }`]
})
export class CardsComponent implements OnInit {
  payments: GateCapture[] = [];
  loading = false;
  readonly mockAmount = MOCK_AMOUNT;

  readonly i18n = inject(I18nService);

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadPayments(); }

  get todayCount(): number {
    const today = new Date().toDateString();
    return this.payments.filter(p => new Date(p.capturedAt).toDateString() === today).length;
  }

  get totalAmount(): number {
    return this.payments.length * MOCK_AMOUNT;
  }

  loadPayments(): void {
    this.loading = true;
    this.http.get<CapturesResponse>(`${API_CONFIG.baseUrl}/captures?hasCardUid=true&limit=200`).subscribe({
      next: (res) => {
        this.payments = res.items ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }
}
