import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { UserApiService, AppUser } from '../../core/services/user-api.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TranslatePipe],
  template: `
    <div class="p-3 sm:p-4 md:p-8 bg-slate-50 min-h-full space-y-4 sm:space-y-6">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs sm:text-sm font-semibold text-indigo-600 uppercase tracking-[0.25em]">{{ 'users.label' | t }}</p>
          <h1 class="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{{ 'users.title' | t }}</h1>
          <p class="text-slate-600 mt-2 max-w-3xl text-sm sm:text-base">{{ 'users.subtitle' | t }}</p>
        </div>
        <button
          *ngIf="isAdmin"
          type="button"
          (click)="toggleForm()"
          class="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm sm:text-base"
        >
          <i class="fas fa-user-plus"></i>
          <span>{{ 'users.add' | t }}</span>
        </button>
      </div>

      <div *ngIf="!isAdmin" class="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5 text-red-700 text-sm sm:text-base">
        {{ 'users.noPermission' | t }}
      </div>

      <div *ngIf="isAdmin && showForm" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <h2 class="text-base sm:text-lg font-bold text-slate-900 mb-4">{{ 'users.createNew' | t }}</h2>
        <form class="grid sm:grid-cols-2 gap-3 sm:gap-4" (ngSubmit)="createUser()">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ 'users.fullName' | t }}</label>
            <input [(ngModel)]="form.fullName" name="fullName" required class="w-full rounded-xl border border-slate-300 px-4 py-3" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ 'login.email' | t }}</label>
            <input [(ngModel)]="form.email" name="email" type="email" required class="w-full rounded-xl border border-slate-300 px-4 py-3" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ 'login.password' | t }}</label>
            <input [(ngModel)]="form.password" name="password" type="password" required class="w-full rounded-xl border border-slate-300 px-4 py-3" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ 'users.role' | t }}</label>
            <select [(ngModel)]="form.role" name="role" class="w-full rounded-xl border border-slate-300 px-4 py-3">
              <option value="admin">{{ 'users.role.admin' | t }}</option>
              <option value="operator">{{ 'users.role.operator' | t }}</option>
              <option value="reviewer">{{ 'users.role.reviewer' | t }}</option>
            </select>
          </div>
          <div class="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <label class="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" [(ngModel)]="form.isActive" name="isActive" />
              <span>{{ 'users.activeAccount' | t }}</span>
            </label>
            <button type="submit" class="rounded-xl bg-slate-900 text-white px-5 py-3 font-semibold hover:bg-slate-800 transition">
              {{ 'users.saveUser' | t }}
            </button>
          </div>
        </form>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-base sm:text-lg font-bold text-slate-900">{{ 'users.systemUsers' | t }}</h2>
          <button type="button" (click)="loadUsers()" class="text-sm font-semibold text-blue-600 hover:text-blue-800">{{ 'common.refresh' | t }}</button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px]">
            <thead class="bg-slate-50 border-b border-slate-200 text-left">
              <tr>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-slate-700">{{ 'users.name' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-slate-700">{{ 'login.email' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-slate-700">{{ 'users.role' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-slate-700">{{ 'common.status' | t }}</th>
                <th class="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-slate-700">{{ 'users.lastLogin' | t }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users" class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="px-4 sm:px-6 py-4 font-semibold text-slate-900">{{ user.fullName }}</td>
                <td class="px-4 sm:px-6 py-4 text-slate-600 break-all">{{ user.email }}</td>
                <td class="px-4 sm:px-6 py-4">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold capitalize" [ngClass]="roleClass(user.role)">
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-4 sm:px-6 py-4">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold" [ngClass]="user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'">
                    {{ user.isActive ? ('common.active' | t) : ('common.inactive' | t) }}
                  </span>
                </td>
                <td class="px-4 sm:px-6 py-4 text-sm text-slate-500">{{ user.lastLoginAt ? (user.lastLoginAt | date:'medium') : ('common.never' | t) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class UsersComponent implements OnInit {
  users: AppUser[] = [];
  showForm = false;
  isAdmin = false;
  form = {
    fullName: '',
    email: '',
    password: '',
    role: 'operator' as AppUser['role'],
    isActive: true,
  };

  readonly i18n = inject(I18nService);

  constructor(
    private readonly userApi: UserApiService,
    private readonly auth: AuthService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.currentUser?.role === 'admin';
    if (this.isAdmin) this.loadUsers();
  }

  toggleForm(): void { this.showForm = !this.showForm; }

  loadUsers(): void {
    if (!this.isAdmin) return;
    this.userApi.getUsers().subscribe({
      next: (users) => { this.users = users; },
      error: () => { this.feedback.errorToast(this.i18n.t('users.loadFailed')); },
    });
  }

  createUser(): void {
    if (!this.isAdmin) {
      this.feedback.errorToast(this.i18n.t('users.permissionDenied'));
      return;
    }
    this.userApi.createUser(this.form).subscribe({
      next: (user) => {
        this.feedback.successToast(`${user.fullName} ${this.i18n.t('users.lastLogin').toLowerCase()}`);
        this.form = { fullName: '', email: '', password: '', role: 'operator', isActive: true };
        this.showForm = false;
        this.loadUsers();
      },
      error: (error) => {
        const message = error?.error?.message || this.i18n.t('users.createFailed');
        this.feedback.errorToast(message);
      },
    });
  }

  roleClass(role: AppUser['role']): string {
    switch (role) {
      case 'admin': return 'bg-indigo-100 text-indigo-800';
      case 'reviewer': return 'bg-amber-100 text-amber-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  }
}
