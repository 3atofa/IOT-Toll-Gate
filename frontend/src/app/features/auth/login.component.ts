import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FeedbackService } from '../../core/services/feedback.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div class="max-w-5xl w-full grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900">
        <div class="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-blue-700 via-slate-900 to-slate-950">
          <div>
            <div class="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/10">
              <i class="fas fa-shield-halved text-blue-300"></i>
              <span class="text-sm">Secure Government Toll System</span>
            </div>
            <h1 class="text-4xl font-black mt-8 leading-tight">Intelligent IoT Toll Gate</h1>
            <p class="text-slate-300 mt-4 text-lg max-w-md">
              Sign in to manage toll captures, review alerts, generate reports, and control access with role-based permissions.
            </p>
          </div>
          <div class="space-y-3 text-slate-300 text-sm">
            <p><i class="fas fa-circle-check text-emerald-400 mr-2"></i> RFID payment automation</p>
            <p><i class="fas fa-circle-check text-emerald-400 mr-2"></i> Plate and face security screening</p>
            <p><i class="fas fa-circle-check text-emerald-400 mr-2"></i> PDF reports and audit logs</p>
          </div>
        </div>

        <div class="bg-white text-slate-800 p-8 md:p-12">
          <div class="max-w-md mx-auto">
            <div class="mb-8">
              <p class="text-sm font-semibold text-blue-700 uppercase tracking-[0.25em]">Admin Portal</p>
              <h2 class="text-3xl font-black mt-2">Login</h2>
              <p class="text-slate-500 mt-2">Use your authorized account to continue.</p>
            </div>

            <form class="space-y-5" (ngSubmit)="submit()">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  name="email"
                  [(ngModel)]="email"
                  type="email"
                  required
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin&#64;tollgate.iot"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <input
                  name="password"
                  [(ngModel)]="password"
                  type="password"
                  required
                  class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                [disabled]="loading"
                class="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 transition"
              >
                <span *ngIf="!loading">Sign In</span>
                <span *ngIf="loading">Signing in...</span>
              </button>
            </form>

            <div class="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
              <p class="font-semibold text-slate-700 mb-2">Default demo account</p>
              <p>Email: admin&#64;tollgate.iot</p>
              <p>Password: Admin&#64;123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = 'admin@tollgate.iot';
  password = 'Admin@123456';
  loading = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly feedback: FeedbackService
  ) {}

  submit(): void {
    if (!this.email || !this.password) {
      this.feedback.errorToast('Email and password are required.');
      return;
    }

    this.loading = true;
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (user) => {
        this.loading = false;
        this.feedback.successToast(`Welcome back, ${user.fullName}.`, 'Login Successful');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading = false;
        const message = error?.error?.message || 'Login failed.';
        this.feedback.errorToast(message, 'Authentication Error');
      },
    });
  }
}
