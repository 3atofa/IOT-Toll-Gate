import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/config/api.config';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

interface AllowedCard {
  id: string;
  cardUID: string;
  cardHolder: string;
  cardType: string;
  isActive: boolean;
  department: string;
  expiryDate: string;
  createdAt: string;
}

interface CardResponse {
  total: number;
  count: number;
  cards: AllowedCard[];
}

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="p-3 sm:p-4 md:p-8">
      <div class="mb-4 sm:mb-8 flex flex-wrap justify-between items-center gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 mb-1 sm:mb-2">{{ 'cards.title' | t }}</h1>
          <p class="text-sm sm:text-base text-slate-600">{{ 'cards.subtitle' | t }}</p>
        </div>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition flex items-center gap-2 text-sm sm:text-base">
          <i class="fas fa-plus"></i> <span>{{ 'cards.add' | t }}</span>
        </button>
      </div>

      <div class="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <select
          [(ngModel)]="cardTypeFilter"
          (ngModelChange)="loadCards()"
          class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{{ 'common.allTypes' | t }}</option>
          <option value="employee">{{ 'cards.type.employee' | t }}</option>
          <option value="visitor">{{ 'cards.type.visitor' | t }}</option>
          <option value="vehicle">{{ 'cards.type.vehicle' | t }}</option>
          <option value="admin">{{ 'cards.type.admin' | t }}</option>
        </select>
        <select
          [(ngModel)]="activeFilter"
          (ngModelChange)="loadCards()"
          class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{{ 'common.allStatus' | t }}</option>
          <option value="true">{{ 'common.active' | t }}</option>
          <option value="false">{{ 'common.inactive' | t }}</option>
        </select>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px]">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'cards.uid' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'cards.holder' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'cards.type' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'cards.department' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'common.status' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'cards.expiry' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-slate-700">{{ 'common.actions' | t }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let card of cards" class="border-b border-slate-200 hover:bg-slate-50 transition">
                <td class="px-4 sm:px-6 py-4">
                  <span class="font-mono bg-slate-100 px-2 py-1 rounded text-sm">{{ card.cardUID }}</span>
                </td>
                <td class="px-4 sm:px-6 py-4 text-sm text-slate-600">{{ card.cardHolder }}</td>
                <td class="px-4 sm:px-6 py-4 text-sm text-slate-600 capitalize">{{ card.cardType }}</td>
                <td class="px-4 sm:px-6 py-4 text-sm text-slate-600">{{ card.department || ('common.na' | t) }}</td>
                <td class="px-4 sm:px-6 py-4">
                  <button (click)="toggleCardStatus(card)"
                          class="px-3 py-1 rounded-full text-xs font-bold transition"
                          [ngClass]="{
                            'bg-green-100 text-green-800 hover:bg-green-200': card.isActive,
                            'bg-slate-100 text-slate-800 hover:bg-slate-200': !card.isActive
                          }">
                    {{ card.isActive ? ('common.active' | t) : ('common.inactive' | t) }}
                  </button>
                </td>
                <td class="px-4 sm:px-6 py-4 text-sm text-slate-600">{{ card.expiryDate ? (card.expiryDate | date:'short') : ('cards.noExpiry' | t) }}</td>
                <td class="px-4 sm:px-6 py-4 flex gap-2">
                  <button class="text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="text-red-600 hover:text-red-800 text-sm">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="cards.length === 0" class="text-center py-8">
          <i class="fas fa-id-card text-4xl text-slate-400 mb-4"></i>
          <p class="text-slate-600">{{ 'cards.empty' | t }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class CardsComponent implements OnInit {
  cards: AllowedCard[] = [];
  cardTypeFilter = '';
  activeFilter = '';

  readonly i18n = inject(I18nService);

  constructor(
    private http: HttpClient,
    private feedback: FeedbackService
  ) {}

  ngOnInit(): void { this.loadCards(); }

  loadCards(): void {
    let url = `${API_CONFIG.baseUrl}/cards?limit=100`;
    if (this.cardTypeFilter) url += `&cardType=${this.cardTypeFilter}`;
    if (this.activeFilter) url += `&isActive=${this.activeFilter}`;

    this.http.get<CardResponse>(url).subscribe({
      next: (response) => { this.cards = response.cards; },
      error: () => { this.feedback.errorToast(this.i18n.t('cards.empty')); },
    });
  }

  toggleCardStatus(card: AllowedCard): void {
    this.http.patch(`${API_CONFIG.baseUrl}/cards/${card.id}/toggle`, {}).subscribe({
      next: () => { card.isActive = !card.isActive; },
      error: () => { this.feedback.errorToast(this.i18n.t('cards.empty')); },
    });
  }
}
