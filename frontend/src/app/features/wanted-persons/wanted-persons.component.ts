import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../core/services/feedback.service';
import { SecurityApiService, CreateWantedPersonPayload, UpdateWantedPersonPayload } from '../../core/services/security-api.service';
import { SecurityAlert, WantedPerson } from '../../core/models/security.model';

@Component({
  selector: 'app-wanted-persons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="min-h-screen bg-slate-100 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Security Watchlist</p>
              <h1 class="mt-1 text-3xl font-black text-slate-900">Wanted Persons</h1>
              <p class="mt-2 text-slate-600">Upload face image and name. If matched at gate, a blocked alert is raised with car plate details.</p>
            </div>
            <button
              type="button"
              (click)="loadAll()"
              class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <i class="fa-solid fa-arrows-rotate"></i>
              Refresh
            </button>
          </div>
        </header>

        <div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 class="text-xl font-bold text-slate-900">{{ isEditing ? 'Edit Wanted Person' : 'Add Wanted Person' }}</h2>
            <p class="mt-1 text-sm text-slate-600">Provide a clear front-face image for better matching accuracy.</p>

            <form class="mt-6 space-y-4" (ngSubmit)="saveWantedPerson()">
              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  name="fullName"
                  [(ngModel)]="form.fullName"
                  required
                  placeholder="Enter wanted person name"
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                  <select
                    name="status"
                    [(ngModel)]="form.status"
                    class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">Face Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    (change)="onFaceImageSelected($event)"
                    class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white hover:file:bg-slate-700"
                  />
                </div>
              </div>

              <div *ngIf="imagePreviewUrl || (isEditing && existingFaceImagePath)" class="rounded-xl border border-slate-200 p-3">
                <p class="mb-2 text-xs uppercase tracking-wide text-slate-500">{{ imagePreviewUrl ? 'Preview' : 'Current Image' }}</p>
                <img
                  [src]="imagePreviewUrl || displayImageUrl(existingFaceImagePath)"
                  alt="Wanted person preview"
                  class="max-h-52 rounded-lg object-cover"
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
                <textarea
                  name="notes"
                  [(ngModel)]="form.notes"
                  rows="3"
                  placeholder="Reason for watchlist"
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                ></textarea>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  [disabled]="saving"
                  class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {{ saving ? 'Saving...' : (isEditing ? 'Update Wanted Person' : 'Save Wanted Person') }}
                </button>
                <button
                  *ngIf="isEditing"
                  type="button"
                  (click)="cancelEdit()"
                  class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel Edit
                </button>
                <button
                  type="button"
                  (click)="resetForm()"
                  class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </form>
          </article>

          <aside class="space-y-6">
            <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 class="text-xl font-bold text-slate-900">Recent Wanted Alerts</h2>
              <div *ngIf="wantedAlerts.length === 0" class="py-6 text-sm text-slate-500">No wanted-person alerts yet.</div>
              <div *ngFor="let alert of wantedAlerts.slice(0, 6)" class="mt-4 rounded-xl border border-slate-200 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-bold text-red-700">{{ alert.relatedName || 'Wanted Person Match' }}</p>
                    <p class="mt-1 text-xs text-slate-500">{{ alert.createdAt | date:'MMM d, y, h:mm a' }}</p>
                  </div>
                  <span class="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">BLOCK</span>
                </div>
                <p class="mt-2 text-sm text-slate-700">{{ alert.reason }}</p>
                <p class="mt-2 text-sm font-semibold text-slate-900">
                  Car Plate: {{ alert.relatedPlate || metadataPlate(alert) || 'Unknown' }}
                </p>
                <p class="mt-1 text-xs text-slate-600">Gate: {{ metadataGate(alert) || 'Unknown' }}</p>
              </div>
            </div>
          </aside>
        </div>

        <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 class="text-xl font-bold text-slate-900">Wanted Persons List</h2>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[980px] border-collapse">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th class="pb-3 pr-4">Photo</th>
                  <th class="pb-3 pr-4">Name</th>
                  <th class="pb-3 pr-4">Status</th>
                  <th class="pb-3 pr-4">Notes</th>
                  <th class="pb-3 pr-4">Created</th>
                  <th class="pb-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let person of wantedPersons" class="border-b border-slate-100">
                  <td class="py-4 pr-4">
                    <img
                      *ngIf="person.faceImagePath"
                      [src]="displayImageUrl(person.faceImagePath)"
                      alt="Wanted face"
                      class="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200"
                    />
                    <span *ngIf="!person.faceImagePath" class="text-sm text-slate-500">No image</span>
                  </td>
                  <td class="py-4 pr-4 text-sm font-bold text-slate-900">{{ person.fullName }}</td>
                  <td class="py-4 pr-4 text-sm">
                    <span class="rounded-full px-2 py-1 text-xs font-semibold"
                          [ngClass]="person.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'">
                      {{ person.status | uppercase }}
                    </span>
                  </td>
                  <td class="py-4 pr-4 text-sm text-slate-700">{{ person.notes || '—' }}</td>
                  <td class="py-4 pr-4 text-sm text-slate-600">{{ person.createdAt | date:'MMM d, y, h:mm a' }}</td>
                  <td class="py-4 pr-4 text-sm">
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        (click)="startEdit(person)"
                        class="rounded-lg border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deletePerson(person)"
                        class="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p *ngIf="wantedPersons.length === 0" class="py-8 text-center text-slate-500">No wanted persons added yet.</p>
        </section>
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

  form: CreateWantedPersonPayload = {
    fullName: '',
    status: 'active',
    notes: '',
  };

  constructor(
    private readonly securityApi: SecurityApiService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.securityApi.getWantedPersons().subscribe({
      next: (items) => {
        this.wantedPersons = items;
      },
      error: () => this.feedback.errorToast('Failed to load wanted persons', 'Error'),
    });

    this.securityApi.getSecurityAlerts().subscribe({
      next: (alerts) => {
        this.wantedAlerts = alerts.filter((item) => item.alertType === 'wanted_person');
      },
      error: () => this.feedback.errorToast('Failed to load security alerts', 'Error'),
    });
  }

  onFaceImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.selectedImageFile = file;

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }

    if (file) {
      this.imagePreviewUrl = URL.createObjectURL(file);
    }
  }

  saveWantedPerson(): void {
    const fullName = String(this.form.fullName || '').trim();
    if (!fullName) {
      this.feedback.errorToast('Full name is required', 'Validation');
      return;
    }

    if (!this.isEditing && !this.selectedImageFile) {
      this.feedback.errorToast('Face image is required', 'Validation');
      return;
    }

    this.saving = true;
    const payload: CreateWantedPersonPayload = {
      fullName,
      status: this.form.status || 'active',
      notes: this.form.notes || '',
    };

    if (this.isEditing && this.editingId != null) {
      const updatePayload: UpdateWantedPersonPayload = {
        ...payload,
        faceImagePath: this.selectedImageFile ? this.existingFaceImagePath || undefined : this.existingFaceImagePath || undefined,
      };

      this.securityApi.updateWantedPerson(this.editingId, updatePayload, this.selectedImageFile).subscribe({
        next: () => {
          this.feedback.successToast('Wanted person updated successfully', 'Saved');
          this.saving = false;
          this.resetForm();
          this.loadAll();
        },
        error: () => {
          this.saving = false;
          this.feedback.errorToast('Failed to update wanted person', 'Error');
        },
      });
      return;
    }

    this.securityApi.createWantedPerson(payload, this.selectedImageFile as File).subscribe({
      next: () => {
        this.feedback.successToast('Wanted person saved successfully', 'Saved');
        this.saving = false;
        this.resetForm();
        this.loadAll();
      },
      error: () => {
        this.saving = false;
        this.feedback.errorToast('Failed to save wanted person', 'Error');
      },
    });
  }

  startEdit(person: WantedPerson): void {
    this.isEditing = true;
    this.editingId = person.id;
    this.existingFaceImagePath = person.faceImagePath || null;
    this.form = {
      fullName: person.fullName,
      status: person.status,
      notes: person.notes || '',
    };

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }

    this.selectedImageFile = null;
  }

  cancelEdit(): void {
    this.resetForm();
  }

  deletePerson(person: WantedPerson): void {
    this.feedback.confirmDelete(`Delete wanted person ${person.fullName}?`).then((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.securityApi.deleteWantedPerson(person.id).subscribe({
        next: () => {
          this.feedback.successToast('Wanted person deleted successfully', 'Deleted');
          if (this.editingId === person.id) {
            this.resetForm();
          }
          this.loadAll();
        },
        error: () => this.feedback.errorToast('Failed to delete wanted person', 'Error'),
      });
    });
  }

  resetForm(): void {
    this.form = {
      fullName: '',
      status: 'active',
      notes: '',
    };
    this.selectedImageFile = null;
    this.existingFaceImagePath = null;
    this.isEditing = false;
    this.editingId = null;

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }
  }

  displayImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) {
      return '';
    }

    if (imagePath.startsWith('/')) {
      return `${window.location.origin}${imagePath}`;
    }

    if (window.location.protocol === 'https:' && imagePath.startsWith('http://')) {
      return imagePath.replace(/^http:\/\//i, 'https://');
    }

    return imagePath;
  }

  metadataGate(alert: SecurityAlert): string {
    return this.parseMetadata(alert)?.gateId || '';
  }

  metadataPlate(alert: SecurityAlert): string {
    return this.parseMetadata(alert)?.plateText || '';
  }

  private parseMetadata(alert: SecurityAlert): any {
    if (!alert.metadata) {
      return null;
    }

    try {
      return JSON.parse(alert.metadata);
    } catch {
      return null;
    }
  }
}
