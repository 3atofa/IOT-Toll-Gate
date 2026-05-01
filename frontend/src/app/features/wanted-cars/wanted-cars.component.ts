import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SecurityApiService, CreateStolenCarPayload } from '../../core/services/security-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { StolenCar, SecurityAlert } from '../../core/models/security.model';

@Component({
  selector: 'app-wanted-cars',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <section class="min-h-full bg-slate-100 p-3 sm:p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <header class="rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
          <div class="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div class="min-w-0">
              <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{{ 'wc.label' | t }}</p>
              <h1 class="mt-1 text-2xl sm:text-3xl font-black text-slate-900">{{ 'wc.title' | t }}</h1>
              <p class="mt-2 text-slate-600 text-sm sm:text-base">{{ 'wc.subtitle' | t }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" (click)="openCreateModal()"
                class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                <i class="fa-solid fa-plus"></i>
                <span>{{ 'wc.add' | t }}</span>
              </button>
              <button type="button" (click)="loadAll()"
                class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                <i class="fa-solid fa-arrows-rotate"></i>
                <span>{{ 'common.refresh' | t }}</span>
              </button>
            </div>
          </div>
        </header>

        <div class="grid gap-4 sm:gap-6 xl:grid-cols-2">
          <div class="rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
            <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ 'wc.summary' | t }}</h2>
            <div class="mt-4 grid grid-cols-3 gap-3 text-center">
              <div class="rounded-xl bg-red-50 p-3 sm:p-4">
                <p class="text-[10px] sm:text-xs uppercase tracking-wide text-red-500">{{ 'wc.blocked' | t }}</p>
                <p class="mt-1 text-xl sm:text-2xl font-black text-red-700">{{ blockedCount }}</p>
              </div>
              <div class="rounded-xl bg-amber-50 p-3 sm:p-4">
                <p class="text-[10px] sm:text-xs uppercase tracking-wide text-amber-500">{{ 'wc.review' | t }}</p>
                <p class="mt-1 text-xl sm:text-2xl font-black text-amber-700">{{ reviewCount }}</p>
              </div>
              <div class="rounded-xl bg-emerald-50 p-3 sm:p-4">
                <p class="text-[10px] sm:text-xs uppercase tracking-wide text-emerald-500">{{ 'wc.allowed' | t }}</p>
                <p class="mt-1 text-xl sm:text-2xl font-black text-emerald-700">{{ allowCount }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
            <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ 'wc.latestAlerts' | t }}</h2>
            <div *ngIf="alerts.length === 0" class="py-6 text-sm text-slate-500">{{ 'wc.noAlerts' | t }}</div>
            <div *ngFor="let alert of alerts.slice(0, 5)" class="mt-3 sm:mt-4 rounded-xl border border-slate-200 p-3 sm:p-4">
              <div class="flex items-center justify-between gap-3">
                <p class="font-semibold text-slate-900 text-sm">{{ alert.alertType | uppercase }}</p>
                <span class="rounded-full px-2 py-1 text-xs font-bold"
                      [ngClass]="alert.decision === 'block' ? 'bg-red-100 text-red-800' : alert.decision === 'review' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'">
                  {{ alert.decision | uppercase }}
                </span>
              </div>
              <p class="mt-2 text-sm text-slate-600">{{ alert.reason }}</p>
            </div>
          </div>
        </div>

        <section class="rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
          <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ 'wc.list' | t }}</h2>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[820px] border-collapse">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th class="pb-3 pe-4">{{ 'wc.plate' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'wc.vehicleType' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'common.status' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'common.notes' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'common.created' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'common.actions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let car of wantedCars" class="border-b border-slate-100">
                  <td class="py-4 pe-4 text-sm font-bold text-slate-900">{{ car.plateNumber }}</td>
                  <td class="py-4 pe-4 text-sm text-slate-700">{{ car.vehicleType || ('common.na' | t) }}</td>
                  <td class="py-4 pe-4 text-sm">
                    <span class="rounded-full px-2 py-1 text-xs font-semibold"
                          [ngClass]="car.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'">
                      {{ car.status === 'active' ? ('common.active' | t) : ('common.inactive' | t) }}
                    </span>
                  </td>
                  <td class="py-4 pe-4 text-sm text-slate-700">{{ car.notes || '—' }}</td>
                  <td class="py-4 pe-4 text-sm text-slate-600">{{ car.createdAt | date:'MMM d, y, h:mm a' }}</td>
                  <td class="py-4 pe-4 text-sm">
                    <div class="flex items-center gap-2">
                      <button type="button" (click)="openEditModal(car)"
                        class="rounded-lg border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                        {{ 'common.edit' | t }}
                      </button>
                      <button type="button" (click)="openDeleteModal(car)"
                        class="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                        {{ 'common.delete' | t }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p *ngIf="wantedCars.length === 0" class="py-8 text-center text-slate-500">{{ 'wc.empty' | t }}</p>
        </section>

        <div *ngIf="showFormModal" class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
          <div class="w-full max-w-xl rounded-2xl bg-white p-4 sm:p-6 shadow-xl my-auto">
            <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ isEditing ? ('wc.editTitle' | t) : ('wc.addTitle' | t) }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ 'wc.formSubtitle' | t }}</p>

            <form class="mt-5 space-y-4" (ngSubmit)="saveCar()">
              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'wc.plate' | t }}</label>
                <input name="plateNumber" [(ngModel)]="form.plateNumber" required
                  [placeholder]="'wc.platePlaceholder' | t"
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'wc.vehicleType' | t }}</label>
                  <input name="vehicleType" [(ngModel)]="form.vehicleType"
                    [placeholder]="'wc.typePlaceholder' | t"
                    class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'common.status' | t }}</label>
                  <select name="status" [(ngModel)]="form.status"
                    class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    <option value="active">{{ 'common.active' | t }}</option>
                    <option value="inactive">{{ 'common.inactive' | t }}</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'common.notes' | t }}</label>
                <textarea name="notes" [(ngModel)]="form.notes" rows="4"
                  [placeholder]="'wc.notesPlaceholder' | t"
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"></textarea>
              </div>

              <div class="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button type="button" (click)="closeFormModal()"
                  class="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  {{ 'common.cancel' | t }}
                </button>
                <button type="submit"
                  class="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                  {{ isEditing ? ('wc.update' | t) : ('wc.save' | t) }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div *ngIf="showDeleteModal && deletingCar" class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ 'wc.deleteTitle' | t }}</h2>
            <p class="mt-2 text-sm text-slate-700">
              {{ 'wc.deleteConfirm' | t }} <span class="font-bold">{{ deletingCar.plateNumber }}</span>?
            </p>
            <div class="mt-6 flex items-center justify-end gap-3">
              <button type="button" (click)="closeDeleteModal()"
                class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {{ 'common.cancel' | t }}
              </button>
              <button type="button" (click)="confirmDeleteCar()"
                class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                {{ 'common.delete' | t }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class WantedCarsComponent implements OnInit {
  wantedCars: StolenCar[] = [];
  alerts: SecurityAlert[] = [];
  isEditing = false;
  editingId: number | null = null;
  showFormModal = false;
  showDeleteModal = false;
  deletingCar: StolenCar | null = null;

  form: CreateStolenCarPayload = { plateNumber: '', vehicleType: '', status: 'active', notes: '' };

  blockedCount = 0;
  reviewCount = 0;
  allowCount = 0;

  readonly i18n = inject(I18nService);

  constructor(
    private readonly securityApi: SecurityApiService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.securityApi.getStolenCars().subscribe({
      next: (cars) => { this.wantedCars = cars; },
      error: () => this.feedback.errorToast(this.i18n.t('wp.loadFailed')),
    });
    this.securityApi.getSecurityAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.blockedCount = alerts.filter((item) => item.decision === 'block').length;
        this.reviewCount = alerts.filter((item) => item.decision === 'review').length;
        this.allowCount = alerts.filter((item) => item.decision === 'allow').length;
      },
      error: () => { /* silent */ },
    });
  }

  saveCar(): void {
    const plateNumber = (this.form.plateNumber || '').trim().toUpperCase();
    if (!plateNumber) { this.feedback.errorToast(this.i18n.t('wc.plateRequired')); return; }

    const payload: CreateStolenCarPayload = {
      plateNumber,
      plateNormalized: plateNumber.replace(/\s+/g, ''),
      vehicleType: this.form.vehicleType || '',
      status: this.form.status || 'active',
      notes: this.form.notes || '',
    };

    const request$ = this.isEditing && this.editingId != null
      ? this.securityApi.updateStolenCar(this.editingId, payload)
      : this.securityApi.createStolenCar(payload);

    request$.subscribe({
      next: () => {
        this.feedback.successToast(this.isEditing ? this.i18n.t('wp.updatedSuccess') : this.i18n.t('wp.savedSuccess'));
        this.resetForm();
        this.showFormModal = false;
        this.loadAll();
      },
      error: () => this.feedback.errorToast(this.isEditing ? this.i18n.t('wp.updateFailed') : this.i18n.t('wp.saveFailed')),
    });
  }

  openCreateModal(): void { this.resetForm(); this.showFormModal = true; }

  openEditModal(car: StolenCar): void {
    this.isEditing = true;
    this.editingId = car.id;
    this.form = { plateNumber: car.plateNumber, vehicleType: car.vehicleType || '', status: car.status, notes: car.notes || '' };
    this.showFormModal = true;
  }

  closeFormModal(): void { this.resetForm(); this.showFormModal = false; }
  openDeleteModal(car: StolenCar): void { this.deletingCar = car; this.showDeleteModal = true; }
  closeDeleteModal(): void { this.deletingCar = null; this.showDeleteModal = false; }

  confirmDeleteCar(): void {
    if (!this.deletingCar) return;
    const deleteId = this.deletingCar.id;
    this.securityApi.deleteStolenCar(deleteId).subscribe({
      next: () => {
        this.feedback.successToast(this.i18n.t('wp.deletedSuccess'));
        if (this.editingId === deleteId) { this.resetForm(); this.showFormModal = false; }
        this.closeDeleteModal();
        this.loadAll();
      },
      error: () => this.feedback.errorToast(this.i18n.t('wp.deleteFailed')),
    });
  }

  resetForm(): void {
    this.isEditing = false;
    this.editingId = null;
    this.form = { plateNumber: '', vehicleType: '', status: 'active', notes: '' };
  }
}
