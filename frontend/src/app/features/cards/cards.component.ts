import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/config/api.config';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../core/services/feedback.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8">
      <!-- Header -->
      <div class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-slate-800 mb-2">RFID Card Management</h1>
          <p class="text-slate-600">Manage authorized access cards</p>
        </div>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition flex items-center gap-2">
          <i class="fas fa-plus"></i> Add Card
        </button>
      </div>

      <!-- Filter -->
      <div class="mb-6 flex gap-4">
        <select 
          [(ngModel)]="cardTypeFilter"
          (ngModelChange)="loadCards()"
          class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="employee">Employee</option>
          <option value="visitor">Visitor</option>
          <option value="vehicle">Vehicle</option>
          <option value="admin">Admin</option>
        </select>
        <select 
          [(ngModel)]="activeFilter"
          (ngModelChange)="loadCards()"
          class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <!-- Cards Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Card UID</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Holder</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Type</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Department</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Status</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Expiry Date</th>
              <th class="px-6 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let card of cards" class="border-b border-slate-200 hover:bg-slate-50 transition">
              <td class="px-6 py-4">
                <span class="font-mono bg-slate-100 px-2 py-1 rounded text-sm">{{ card.cardUID }}</span>
              </td>
              <td class="px-6 py-4 text-sm text-slate-600">{{ card.cardHolder }}</td>
              <td class="px-6 py-4 text-sm text-slate-600 capitalize">{{ card.cardType }}</td>
              <td class="px-6 py-4 text-sm text-slate-600">{{ card.department || 'N/A' }}</td>
              <td class="px-6 py-4">
                <button (click)="toggleCardStatus(card)"
                        class="px-3 py-1 rounded-full text-xs font-bold transition"
                        [ngClass]="{
                          'bg-green-100 text-green-800 hover:bg-green-200': card.isActive,
                          'bg-slate-100 text-slate-800 hover:bg-slate-200': !card.isActive
                        }">
                  {{ card.isActive ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="px-6 py-4 text-sm text-slate-600">{{ card.expiryDate ? (card.expiryDate | date:'short') : 'No expiry' }}</td>
              <td class="px-6 py-4 flex gap-2">
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

        <!-- Empty State -->
        <div *ngIf="cards.length === 0" class="text-center py-8">
          <i class="fas fa-id-card text-4xl text-slate-400 mb-4"></i>
          <p class="text-slate-600">No cards found</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CardsComponent implements OnInit {
  cards: AllowedCard[] = [];
  cardTypeFilter = '';
  activeFilter = '';

  constructor(
    private http: HttpClient,
    private feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadCards();
  }

  loadCards(): void {
    let url = `${API_CONFIG.baseUrl}/cards?limit=100`;

    if (this.cardTypeFilter) {
      url += `&cardType=${this.cardTypeFilter}`;
    }
    if (this.activeFilter) {
      url += `&isActive=${this.activeFilter}`;
    }

    this.http.get<CardResponse>(url).subscribe({
      next: (response) => {
        this.cards = response.cards;
      },
      error: () => {
        this.feedback.errorToast('Failed to load cards', 'Error');
      },
    });
  }

  toggleCardStatus(card: AllowedCard): void {
    this.http.patch(`${API_CONFIG.baseUrl}/cards/${card.id}/toggle`, {}).subscribe({
      next: (response: any) => {
        card.isActive = !card.isActive;
        this.feedback.successToast(`Card ${card.isActive ? 'activated' : 'deactivated'}`, 'Success');
      },
      error: () => {
        this.feedback.errorToast('Failed to update card', 'Error');
      },
    });
  }
}
