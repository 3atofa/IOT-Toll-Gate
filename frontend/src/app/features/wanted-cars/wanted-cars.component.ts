import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SecurityApiService, CreateStolenCarPayload } from '../../core/services/security-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { StolenCar, SecurityAlert } from '../../core/models/security.model';

@Component({
  selector: 'app-wanted-cars',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="min-h-screen bg-slate-100 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Security Watchlist</p>
              <h1 class="mt-1 text-3xl font-black text-slate-900">Wanted Cars</h1>
              <p class="mt-2 text-slate-600">Add stolen or wanted vehicles and block them automatically at the gate.</p>
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

        <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 class="text-xl font-bold text-slate-900">{{ isEditing ? 'Edit Wanted Car' : 'Add Wanted Car' }}</h2>
            <p class="mt-1 text-sm text-slate-600">The plate will be compared with recognition results during security checks.</p>

            <form class="mt-6 space-y-4" (ngSubmit)="saveCar()">
              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">Plate Number</label>
                <input
                  name="plateNumber"
                  [(ngModel)]="form.plateNumber"
                  required
                  placeholder="ABC1234"
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">Vehicle Type</label>
                  <input
                    name="vehicleType"
                    [(ngModel)]="form.vehicleType"
                    placeholder="Sedan / SUV / Truck"
                    class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
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
              </div>

              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
                <textarea
                  name="notes"
                  [(ngModel)]="form.notes"
                  rows="4"
                  placeholder="Reason for flagging this car"
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                ></textarea>
              </div>

              <div class="flex items-center gap-3">
                <button
                  type="submit"
                  class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {{ isEditing ? 'Update Wanted Car' : 'Save Wanted Car' }}
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
              <h2 class="text-xl font-bold text-slate-900">Alert Summary</h2>
              <div class="mt-4 grid grid-cols-3 gap-3 text-center">
                <div class="rounded-xl bg-red-50 p-4">
                  <p class="text-xs uppercase tracking-wide text-red-500">Blocked</p>
                  <p class="mt-1 text-2xl font-black text-red-700">{{ blockedCount }}</p>
                </div>
                <div class="rounded-xl bg-amber-50 p-4">
                  <p class="text-xs uppercase tracking-wide text-amber-500">Review</p>
                  <p class="mt-1 text-2xl font-black text-amber-700">{{ reviewCount }}</p>
                </div>
                <div class="rounded-xl bg-emerald-50 p-4">
                  <p class="text-xs uppercase tracking-wide text-emerald-500">Allowed</p>
                  <p class="mt-1 text-2xl font-black text-emerald-700">{{ allowCount }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 class="text-xl font-bold text-slate-900">Latest Alerts</h2>
              <div *ngIf="alerts.length === 0" class="py-6 text-sm text-slate-500">No security alerts yet.</div>
              <div *ngFor="let alert of alerts.slice(0, 5)" class="mt-4 rounded-xl border border-slate-200 p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="font-semibold text-slate-900">{{ alert.alertType | uppercase }}</p>
                  <span class="rounded-full px-2 py-1 text-xs font-bold"
                        [ngClass]="alert.decision === 'block' ? 'bg-red-100 text-red-800' : alert.decision === 'review' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'">
                    {{ alert.decision | uppercase }}
                  </span>
                </div>
                <p class="mt-2 text-sm text-slate-600">{{ alert.reason }}</p>
              </div>
            </div>
          </aside>
        </div>

        <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 class="text-xl font-bold text-slate-900">Wanted Cars List</h2>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[900px] border-collapse">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th class="pb-3 pr-4">Plate</th>
                  <th class="pb-3 pr-4">Type</th>
                  <th class="pb-3 pr-4">Status</th>
                  <th class="pb-3 pr-4">Notes</th>
                  <th class="pb-3 pr-4">Created</th>
                  <th class="pb-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let car of wantedCars" class="border-b border-slate-100">
                  <td class="py-4 pr-4 text-sm font-bold text-slate-900">{{ car.plateNumber }}</td>
                  <td class="py-4 pr-4 text-sm text-slate-700">{{ car.vehicleType || 'N/A' }}</td>
                  <td class="py-4 pr-4 text-sm">
                    <span class="rounded-full px-2 py-1 text-xs font-semibold"
                          [ngClass]="car.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'">
                      {{ car.status | uppercase }}
                    </span>
                  </td>
                  <td class="py-4 pr-4 text-sm text-slate-700">{{ car.notes || '—' }}</td>
                  <td class="py-4 pr-4 text-sm text-slate-600">{{ car.createdAt | date:'MMM d, y, h:mm a' }}</td>
                  <td class="py-4 pr-4 text-sm">
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        (click)="startEdit(car)"
                        class="rounded-lg border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteCar(car)"
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
          <p *ngIf="wantedCars.length === 0" class="py-8 text-center text-slate-500">No wanted cars added yet.</p>
        </section>
      </div>
    </section>
  `,
})
export class WantedCarsComponent implements OnInit {
  wantedCars: StolenCar[] = [];
  alerts: SecurityAlert[] = [];
  isEditing = false;
  editingId: number | null = null;

  form: CreateStolenCarPayload = {
    plateNumber: '',
    vehicleType: '',
    status: 'active',
    notes: '',
  };

  blockedCount = 0;
  reviewCount = 0;
  allowCount = 0;

  constructor(
    private readonly securityApi: SecurityApiService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.securityApi.getStolenCars().subscribe({
      next: (cars) => {
        this.wantedCars = cars;
      },
      error: () => this.feedback.errorToast('Failed to load wanted cars', 'Error'),
    });

    this.securityApi.getSecurityAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.blockedCount = alerts.filter((item) => item.decision === 'block').length;
        this.reviewCount = alerts.filter((item) => item.decision === 'review').length;
        this.allowCount = alerts.filter((item) => item.decision === 'allow').length;
      },
      error: () => this.feedback.errorToast('Failed to load alerts', 'Error'),
    });
  }

  saveCar(): void {
    const plateNumber = (this.form.plateNumber || '').trim().toUpperCase();
    if (!plateNumber) {
      this.feedback.errorToast('Plate number is required', 'Validation');
      return;
    }

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
        this.feedback.successToast(this.isEditing ? 'Wanted car updated successfully' : 'Wanted car saved successfully', 'Saved');
        this.resetForm();
        this.loadAll();
      },
      error: () => this.feedback.errorToast(this.isEditing ? 'Failed to update wanted car' : 'Failed to save wanted car', 'Error'),
    });
  }

  startEdit(car: StolenCar): void {
    this.isEditing = true;
    this.editingId = car.id;
    this.form = {
      plateNumber: car.plateNumber,
      vehicleType: car.vehicleType || '',
      status: car.status,
      notes: car.notes || '',
    };
  }

  cancelEdit(): void {
    this.resetForm();
  }

  deleteCar(car: StolenCar): void {
    this.feedback.confirmDelete(`Delete wanted car ${car.plateNumber}?`).then((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.securityApi.deleteStolenCar(car.id).subscribe({
        next: () => {
          this.feedback.successToast('Wanted car deleted successfully', 'Deleted');
          if (this.editingId === car.id) {
            this.resetForm();
          }
          this.loadAll();
        },
        error: () => this.feedback.errorToast('Failed to delete wanted car', 'Error'),
      });
    });
  }

  resetForm(): void {
    this.isEditing = false;
    this.editingId = null;
    this.form = {
      plateNumber: '',
      vehicleType: '',
      status: 'active',
      notes: '',
    };
  }
}
