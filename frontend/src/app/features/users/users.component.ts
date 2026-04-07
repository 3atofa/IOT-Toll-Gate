import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { UserApiService, AppUser } from '../../core/services/user-api.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="p-8 bg-slate-50 min-h-full space-y-6">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-indigo-600 uppercase tracking-[0.25em]">Administration</p>
          <h1 class="text-3xl font-black text-slate-900 mt-1">User Management</h1>
          <p class="text-slate-600 mt-2 max-w-3xl">
            Create and manage system users with role-based access control for the toll gate web application.
          </p>
        </div>
        <button
          type="button"
          (click)="toggleForm()"
          class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          <i class="fas fa-user-plus"></i>
          Add User
        </button>
      </div>

      <div *ngIf="!isAdmin" class="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
        You do not have permission to manage users.
      </div>

      <div *ngIf="isAdmin && showForm" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 class="text-lg font-bold text-slate-900 mb-4">Create New User</h2>
        <form class="grid md:grid-cols-2 gap-4" (ngSubmit)="createUser()">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
            <input [(ngModel)]="form.fullName" name="fullName" required class="w-full rounded-xl border border-slate-300 px-4 py-3" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Email</label>
            <input [(ngModel)]="form.email" name="email" type="email" required class="w-full rounded-xl border border-slate-300 px-4 py-3" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input [(ngModel)]="form.password" name="password" type="password" required class="w-full rounded-xl border border-slate-300 px-4 py-3" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Role</label>
            <select [(ngModel)]="form.role" name="role" class="w-full rounded-xl border border-slate-300 px-4 py-3">
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="reviewer">Reviewer</option>
            </select>
          </div>
          <div class="md:col-span-2 flex items-center justify-between gap-4">
            <label class="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" [(ngModel)]="form.isActive" name="isActive" />
              Active account
            </label>
            <button type="submit" class="rounded-xl bg-slate-900 text-white px-5 py-3 font-semibold hover:bg-slate-800 transition">
              Save User
            </button>
          </div>
        </form>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-900">System Users</h2>
          <button type="button" (click)="loadUsers()" class="text-sm font-semibold text-blue-600 hover:text-blue-800">Refresh</button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 border-b border-slate-200 text-left">
              <tr>
                <th class="px-6 py-4 text-sm font-bold text-slate-700">Name</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-700">Email</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-700">Role</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-700">Status</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-700">Last Login</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users" class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="px-6 py-4 font-semibold text-slate-900">{{ user.fullName }}</td>
                <td class="px-6 py-4 text-slate-600">{{ user.email }}</td>
                <td class="px-6 py-4">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold capitalize" [ngClass]="roleClass(user.role)">
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold" [ngClass]="user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-slate-500">{{ user.lastLoginAt ? (user.lastLoginAt | date:'medium') : 'Never' }}</td>
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

  constructor(
    private readonly userApi: UserApiService,
    private readonly auth: AuthService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.currentUser?.role === 'admin';
    if (this.isAdmin) {
      this.loadUsers();
    }
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  loadUsers(): void {
    if (!this.isAdmin) {
      return;
    }

    this.userApi.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: () => {
        this.feedback.errorToast('Failed to load users.');
      },
    });
  }

  createUser(): void {
    if (!this.isAdmin) {
      this.feedback.errorToast('Permission denied.');
      return;
    }

    this.userApi.createUser(this.form).subscribe({
      next: (user) => {
        this.feedback.successToast(`${user.fullName} was created successfully.`);
        this.form = {
          fullName: '',
          email: '',
          password: '',
          role: 'operator',
          isActive: true,
        };
        this.showForm = false;
        this.loadUsers();
      },
      error: (error) => {
        const message = error?.error?.message || 'Failed to create user.';
        this.feedback.errorToast(message);
      },
    });
  }

  roleClass(role: AppUser['role']): string {
    switch (role) {
      case 'admin':
        return 'bg-indigo-100 text-indigo-800';
      case 'reviewer':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }
}
