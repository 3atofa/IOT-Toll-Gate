import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../core/services/feedback.service';
import { SecurityApiService, CreateWantedPersonPayload, UpdateWantedPersonPayload } from '../../core/services/security-api.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { SecurityAlert, WantedPerson } from '../../core/models/security.model';

@Component({
  selector: 'app-wanted-persons',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <section class="min-h-full bg-slate-100 p-3 sm:p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <header class="rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
          <div class="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div class="min-w-0">
              <p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{{ 'wp.label' | t }}</p>
              <h1 class="mt-1 text-2xl sm:text-3xl font-black text-slate-900">{{ 'wp.title' | t }}</h1>
              <p class="mt-2 text-slate-600 text-sm sm:text-base">{{ 'wp.subtitle' | t }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                (click)="openCreateModal()"
                class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <i class="fa-solid fa-plus"></i>
                <span>{{ 'wp.add' | t }}</span>
              </button>
              <button
                type="button"
                (click)="loadAll()"
                class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <i class="fa-solid fa-arrows-rotate"></i>
                <span>{{ 'common.refresh' | t }}</span>
              </button>
            </div>
          </div>
        </header>

        <div class="rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
          <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ 'wp.recentAlerts' | t }}</h2>
          <div *ngIf="wantedAlerts.length === 0" class="py-6 text-sm text-slate-500">{{ 'wp.noAlerts' | t }}</div>
          <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            <div *ngFor="let alert of wantedAlerts.slice(0, 6)" class="mt-2 sm:mt-4 rounded-xl border border-slate-200 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-red-700 truncate">{{ alert.relatedName || ('wp.matchTitle' | t) }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ alert.createdAt | date:'MMM d, y, h:mm a' }}</p>
                </div>
                <span class="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800 shrink-0">BLOCK</span>
              </div>
              <p class="mt-2 text-sm text-slate-700">{{ alert.reason }}</p>
              <p class="mt-2 text-sm font-semibold text-slate-900">
                {{ 'wp.carPlate' | t }}: {{ alert.relatedPlate || metadataPlate(alert) || ('common.unknown' | t) }}
              </p>
              <p class="mt-1 text-xs text-slate-600">{{ 'wp.gate' | t }}: {{ metadataGate(alert) || ('common.unknown' | t) }}</p>
            </div>
          </div>
        </div>

        <section class="rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
          <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ 'wp.list' | t }}</h2>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[820px] border-collapse">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th class="pb-3 pe-4">{{ 'wp.photo' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'users.name' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'common.status' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'common.notes' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'common.created' | t }}</th>
                  <th class="pb-3 pe-4">{{ 'common.actions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let person of wantedPersons" class="border-b border-slate-100">
                  <td class="py-4 pe-4">
                    <img
                      *ngIf="person.faceImagePath"
                      [src]="displayImageUrl(person.faceImagePath)"
                      alt="Wanted face"
                      class="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200"
                    />
                    <span *ngIf="!person.faceImagePath" class="text-sm text-slate-500">—</span>
                  </td>
                  <td class="py-4 pe-4 text-sm font-bold text-slate-900">{{ person.fullName }}</td>
                  <td class="py-4 pe-4 text-sm">
                    <span class="rounded-full px-2 py-1 text-xs font-semibold"
                          [ngClass]="person.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'">
                      {{ person.status === 'active' ? ('common.active' | t) : ('common.inactive' | t) }}
                    </span>
                  </td>
                  <td class="py-4 pe-4 text-sm text-slate-700">{{ person.notes || '—' }}</td>
                  <td class="py-4 pe-4 text-sm text-slate-600">{{ person.createdAt | date:'MMM d, y, h:mm a' }}</td>
                  <td class="py-4 pe-4 text-sm">
                    <div class="flex items-center gap-2">
                      <button type="button" (click)="openEditModal(person)"
                        class="rounded-lg border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                        {{ 'common.edit' | t }}
                      </button>
                      <button type="button" (click)="openDeleteModal(person)"
                        class="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                        {{ 'common.delete' | t }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p *ngIf="wantedPersons.length === 0" class="py-8 text-center text-slate-500">{{ 'wp.empty' | t }}</p>
        </section>

        <div *ngIf="showFormModal" class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
          <div class="w-full max-w-xl rounded-2xl bg-white p-4 sm:p-6 shadow-xl my-auto">
            <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ isEditing ? ('wp.editTitle' | t) : ('wp.addTitle' | t) }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ 'wp.formSubtitle' | t }}</p>

            <form class="mt-5 space-y-4" (ngSubmit)="saveWantedPerson()">
              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'users.fullName' | t }}</label>
                <input
                  name="fullName"
                  [(ngModel)]="form.fullName"
                  required
                  [placeholder]="'wp.namePlaceholder' | t"
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'common.status' | t }}</label>
                  <select name="status" [(ngModel)]="form.status"
                    class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    <option value="active">{{ 'common.active' | t }}</option>
                    <option value="inactive">{{ 'common.inactive' | t }}</option>
                  </select>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'wp.faceImage' | t }}</label>
                  <input type="file" accept="image/*" (change)="onFaceImageSelected($event)"
                    class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition file:me-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white hover:file:bg-slate-700" />
                </div>
              </div>

              <div *ngIf="imagePreviewUrl || (isEditing && existingFaceImagePath)" class="rounded-xl border border-slate-200 p-3">
                <p class="mb-2 text-xs uppercase tracking-wide text-slate-500">{{ imagePreviewUrl ? ('common.preview' | t) : ('common.currentImage' | t) }}</p>
                <img [src]="imagePreviewUrl || displayImageUrl(existingFaceImagePath)" alt="preview" class="max-h-52 rounded-lg object-cover" />
              </div>

              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">{{ 'common.notes' | t }}</label>
                <textarea name="notes" [(ngModel)]="form.notes" rows="3"
                  [placeholder]="'wp.notesPlaceholder' | t"
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"></textarea>
              </div>

              <div class="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button type="button" (click)="closeFormModal()"
                  class="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  {{ 'common.cancel' | t }}
                </button>
                <button type="submit" [disabled]="saving"
                  class="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400">
                  {{ saving ? ('common.saving' | t) : (isEditing ? ('wp.update' | t) : ('wp.save' | t)) }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div *ngIf="showDeleteModal && deletingPerson" class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ 'wp.deleteTitle' | t }}</h2>
            <p class="mt-2 text-sm text-slate-700">
              {{ 'wp.deleteConfirm' | t }} <span class="font-bold">{{ deletingPerson.fullName }}</span>?
            </p>
            <div class="mt-6 flex items-center justify-end gap-3">
              <button type="button" (click)="closeDeleteModal()"
                class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {{ 'common.cancel' | t }}
              </button>
              <button type="button" (click)="confirmDeletePerson()"
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
export class WantedPersonsComponent implements OnInit {
  wantedPersons: WantedPerson[] = [];
  wantedAlerts: SecurityAlert[] = [];
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  existingFaceImagePath: string | null = null;
  saving = false;
  isEditing = false;
  editingId: number | null = null;
  showFormModal = false;
  showDeleteModal = false;
  deletingPerson: WantedPerson | null = null;

  form: CreateWantedPersonPayload = { fullName: '', status: 'active', notes: '' };

  readonly i18n = inject(I18nService);

  constructor(
    private readonly securityApi: SecurityApiService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.securityApi.getWantedPersons().subscribe({
      next: (items) => { this.wantedPersons = items; },
      error: () => this.feedback.errorToast(this.i18n.t('wp.loadFailed')),
    });
    this.securityApi.getSecurityAlerts().subscribe({
      next: (alerts) => { this.wantedAlerts = alerts.filter((item) => item.alertType === 'wanted_person'); },
      error: () => { /* silent */ },
    });
  }

  onFaceImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.selectedImageFile = file;
    if (this.imagePreviewUrl) { URL.revokeObjectURL(this.imagePreviewUrl); this.imagePreviewUrl = null; }
    if (file) this.imagePreviewUrl = URL.createObjectURL(file);
  }

  saveWantedPerson(): void {
    const fullName = String(this.form.fullName || '').trim();
    if (!fullName) { this.feedback.errorToast(this.i18n.t('wp.nameRequired')); return; }
    if (!this.isEditing && !this.selectedImageFile) { this.feedback.errorToast(this.i18n.t('wp.imageRequired')); return; }

    this.saving = true;
    const payload: CreateWantedPersonPayload = {
      fullName,
      status: this.form.status || 'active',
      notes: this.form.notes || '',
    };

    if (this.isEditing && this.editingId != null) {
      const updatePayload: UpdateWantedPersonPayload = {
        ...payload,
        faceImagePath: this.existingFaceImagePath || undefined,
      };
      this.securityApi.updateWantedPerson(this.editingId, updatePayload, this.selectedImageFile).subscribe({
        next: () => {
          this.feedback.successToast(this.i18n.t('wp.updatedSuccess'));
          this.saving = false;
          this.resetForm();
          this.showFormModal = false;
          this.loadAll();
        },
        error: () => { this.saving = false; this.feedback.errorToast(this.i18n.t('wp.updateFailed')); },
      });
      return;
    }

    this.securityApi.createWantedPerson(payload, this.selectedImageFile as File).subscribe({
      next: () => {
        this.feedback.successToast(this.i18n.t('wp.savedSuccess'));
        this.saving = false;
        this.resetForm();
        this.showFormModal = false;
        this.loadAll();
      },
      error: () => { this.saving = false; this.feedback.errorToast(this.i18n.t('wp.saveFailed')); },
    });
  }

  openCreateModal(): void { this.resetForm(); this.showFormModal = true; }

  openEditModal(person: WantedPerson): void {
    this.isEditing = true;
    this.editingId = person.id;
    this.existingFaceImagePath = person.faceImagePath || null;
    this.form = { fullName: person.fullName, status: person.status, notes: person.notes || '' };
    if (this.imagePreviewUrl) { URL.revokeObjectURL(this.imagePreviewUrl); this.imagePreviewUrl = null; }
    this.selectedImageFile = null;
    this.showFormModal = true;
  }

  closeFormModal(): void { this.resetForm(); this.showFormModal = false; }
  openDeleteModal(person: WantedPerson): void { this.deletingPerson = person; this.showDeleteModal = true; }
  closeDeleteModal(): void { this.deletingPerson = null; this.showDeleteModal = false; }

  confirmDeletePerson(): void {
    if (!this.deletingPerson) return;
    const deleteId = this.deletingPerson.id;
    this.securityApi.deleteWantedPerson(deleteId).subscribe({
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
    this.form = { fullName: '', status: 'active', notes: '' };
    this.selectedImageFile = null;
    this.existingFaceImagePath = null;
    this.isEditing = false;
    this.editingId = null;
    if (this.imagePreviewUrl) { URL.revokeObjectURL(this.imagePreviewUrl); this.imagePreviewUrl = null; }
  }

  displayImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  }

  metadataGate(alert: SecurityAlert): string { return this.parseMetadata(alert)?.gateId || ''; }
  metadataPlate(alert: SecurityAlert): string { return this.parseMetadata(alert)?.plateText || ''; }

  private parseMetadata(alert: SecurityAlert): any {
    if (!alert.metadata) return null;
    try { return JSON.parse(alert.metadata); } catch { return null; }
  }
}
