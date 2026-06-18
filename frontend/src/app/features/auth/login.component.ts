import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div
      class="min-h-screen flex items-center justify-center p-4"
      [class.bg-slate-950]="theme.isDark()"
      [class.bg-slate-100]="!theme.isDark()"
    >

      <!-- ── Top-right controls ──────────────────────────── -->
      <div class="fixed top-4 z-20 flex items-center gap-2"
           [style.right]="i18n.isRtl() ? 'auto' : '1rem'"
           [style.left]="i18n.isRtl() ? '1rem' : 'auto'">
        <button type="button" (click)="i18n.toggle()"
          class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition backdrop-blur"
          [class.border-white_20]="theme.isDark()"
          [class.bg-white_10]="theme.isDark()"
          [class.text-white]="theme.isDark()"
          [class.hover_bg-white_20]="theme.isDark()"
          [class.border-slate-300]="!theme.isDark()"
          [class.bg-white]="!theme.isDark()"
          [class.text-slate-700]="!theme.isDark()"
          style="border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:rgba(255,255,255,.9)"
          [style.border-color]="theme.isDark() ? 'rgba(255,255,255,.2)' : '#e2e8f0'"
          [style.background]="theme.isDark() ? 'rgba(255,255,255,.08)' : 'white'"
          [style.color]="theme.isDark() ? 'rgba(255,255,255,.9)' : '#334155'"
        >
          <i class="fas fa-globe text-xs"></i>
          <span>{{ i18n.lang() === 'en' ? 'العربية' : 'English' }}</span>
        </button>

        <button type="button" (click)="theme.toggle()"
          class="inline-flex items-center justify-center w-10 h-10 rounded-lg border transition"
          [style.border-color]="theme.isDark() ? 'rgba(255,255,255,.2)' : '#e2e8f0'"
          [style.background]="theme.isDark() ? 'rgba(255,255,255,.08)' : 'white'"
          [style.color]="theme.isDark() ? 'rgba(255,255,255,.9)' : '#334155'"
        >
          <i class="fas" [ngClass]="theme.isDark() ? 'fa-sun text-amber-300' : 'fa-moon'"></i>
        </button>
      </div>

      <!-- ── Card ───────────────────────────────────────── -->
      <div class="w-full max-w-4xl grid md:grid-cols-5 rounded-2xl overflow-hidden shadow-2xl"
           [style.background]="theme.isDark() ? '#0f172a' : 'white'"
           [style.border]="theme.isDark() ? '1px solid rgba(255,255,255,.08)' : '1px solid #e2e8f0'">

        <!-- Left panel (3/5) -->
        <div class="md:col-span-3 relative overflow-hidden p-8 lg:p-12 flex flex-col justify-between"
             style="background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 50%, #0f172a 100%)">

          <!-- decorative grid -->
          <div class="absolute inset-0 opacity-10"
               style="background-image: repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,.15) 40px,rgba(255,255,255,.15) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,.15) 40px,rgba(255,255,255,.15) 41px)"></div>
          <!-- glow -->
          <div class="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-20"
               style="background:radial-gradient(circle, #3b82f6, transparent 70%)"></div>
          <div class="absolute -bottom-20 -left-20 w-56 h-56 rounded-full opacity-15"
               style="background:radial-gradient(circle, #06b6d4, transparent 70%)"></div>

          <!-- top badge -->
          <div class="relative z-10">
            <div class="inline-flex items-center gap-3 px-4 py-2 rounded-full mb-8"
                 style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15)">
              <div class="w-7 h-7 rounded-full flex items-center justify-center"
                   style="background:linear-gradient(135deg,#3b82f6,#06b6d4)">
                <i class="fas fa-tower-broadcast text-white" style="font-size:11px"></i>
              </div>
              <span class="text-xs font-semibold text-blue-200 tracking-widest uppercase">Smart IoT Gate System</span>
            </div>

            <h1 class="text-3xl lg:text-4xl font-black text-white leading-tight mb-4">
              {{ 'login.heroTitle' | t }}
            </h1>
            <p class="text-slate-300 text-sm lg:text-base leading-relaxed max-w-sm">
              {{ 'login.heroDesc' | t }}
            </p>
          </div>

          <!-- feature list -->
          <div class="relative z-10 space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style="background:rgba(16,185,129,.2);border:1px solid rgba(16,185,129,.3)">
                <i class="fas fa-circle-check text-emerald-400" style="font-size:11px"></i>
              </div>
              <span class="text-slate-300 text-sm">{{ 'login.feat1' | t }}</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style="background:rgba(16,185,129,.2);border:1px solid rgba(16,185,129,.3)">
                <i class="fas fa-circle-check text-emerald-400" style="font-size:11px"></i>
              </div>
              <span class="text-slate-300 text-sm">{{ 'login.feat2' | t }}</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style="background:rgba(16,185,129,.2);border:1px solid rgba(16,185,129,.3)">
                <i class="fas fa-circle-check text-emerald-400" style="font-size:11px"></i>
              </div>
              <span class="text-slate-300 text-sm">{{ 'login.feat3' | t }}</span>
            </div>

            <!-- stat row -->
            <div class="grid grid-cols-3 gap-3 pt-4 mt-2 border-t"
                 style="border-color:rgba(255,255,255,.1)">
              <div class="text-center">
                <div class="text-xl font-black text-white">24/7</div>
                <div class="text-xs text-slate-400 mt-0.5">Monitoring</div>
              </div>
              <div class="text-center" style="border-left:1px solid rgba(255,255,255,.1);border-right:1px solid rgba(255,255,255,.1)">
                <div class="text-xl font-black text-white">99.9%</div>
                <div class="text-xs text-slate-400 mt-0.5">Uptime</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-black text-white">AI</div>
                <div class="text-xs text-slate-400 mt-0.5">Powered</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right panel (2/5) — form -->
        <div class="md:col-span-2 p-8 lg:p-10 flex flex-col justify-center"
             [style.background]="theme.isDark() ? '#0f172a' : 'white'">

          <!-- logo mark -->
          <div class="flex justify-center mb-8">
            <div class="relative">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                   style="background:linear-gradient(135deg,#1d4ed8,#0ea5e9)">
                <i class="fas fa-shield-halved text-white text-2xl"></i>
              </div>
              <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                   style="background:#10b981;border:2px solid white">
                <i class="fas fa-bolt text-white" style="font-size:8px"></i>
              </div>
            </div>
          </div>

          <!-- heading -->
          <div class="text-center mb-8">
            <p class="text-xs font-bold tracking-[0.2em] uppercase mb-1"
               style="color:#3b82f6">{{ 'login.portal' | t }}</p>
            <h2 class="text-2xl font-black mb-1"
                [style.color]="theme.isDark() ? 'white' : '#0f172a'">{{ 'login.title' | t }}</h2>
            <p class="text-sm" [style.color]="theme.isDark() ? '#94a3b8' : '#64748b'">{{ 'login.subtitle' | t }}</p>
          </div>

          <!-- form -->
          <form class="space-y-4" (ngSubmit)="submit()">

            <!-- email -->
            <div>
              <label class="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                     [style.color]="theme.isDark() ? '#94a3b8' : '#475569'">
                {{ 'login.email' | t }}
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 flex items-center pointer-events-none"
                     [style.left]="i18n.isRtl() ? 'auto' : '12px'"
                     [style.right]="i18n.isRtl() ? '12px' : 'auto'">
                  <i class="fas fa-envelope text-xs" style="color:#64748b"></i>
                </div>
                <input
                  name="email"
                  [(ngModel)]="email"
                  type="email"
                  required
                  autocomplete="email"
                  class="w-full rounded-xl border py-3 text-sm outline-none transition"
                  [style.padding-left]="i18n.isRtl() ? '12px' : '38px'"
                  [style.padding-right]="i18n.isRtl() ? '38px' : '12px'"
                  [style.background]="theme.isDark() ? '#1e293b' : '#f8fafc'"
                  [style.border-color]="theme.isDark() ? 'rgba(255,255,255,.1)' : '#e2e8f0'"
                  [style.color]="theme.isDark() ? 'white' : '#0f172a'"
                  placeholder="admin&#64;tollgate.iot"
                />
              </div>
            </div>

            <!-- password -->
            <div>
              <label class="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                     [style.color]="theme.isDark() ? '#94a3b8' : '#475569'">
                {{ 'login.password' | t }}
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 flex items-center pointer-events-none"
                     [style.left]="i18n.isRtl() ? 'auto' : '12px'"
                     [style.right]="i18n.isRtl() ? '12px' : 'auto'">
                  <i class="fas fa-lock text-xs" style="color:#64748b"></i>
                </div>
                <input
                  name="password"
                  [(ngModel)]="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  class="w-full rounded-xl border py-3 text-sm outline-none transition"
                  [style.padding-left]="i18n.isRtl() ? '40px' : '38px'"
                  [style.padding-right]="i18n.isRtl() ? '38px' : '40px'"
                  [style.background]="theme.isDark() ? '#1e293b' : '#f8fafc'"
                  [style.border-color]="theme.isDark() ? 'rgba(255,255,255,.1)' : '#e2e8f0'"
                  [style.color]="theme.isDark() ? 'white' : '#0f172a'"
                  placeholder="••••••••"
                />
                <button type="button" (click)="showPassword.set(!showPassword())"
                  class="absolute inset-y-0 flex items-center px-3 transition"
                  [style.right]="i18n.isRtl() ? 'auto' : '0'"
                  [style.left]="i18n.isRtl() ? '0' : 'auto'"
                  style="color:#64748b">
                  <i class="fas text-xs" [ngClass]="showPassword() ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
            </div>

            <!-- submit -->
            <button
              type="submit"
              [disabled]="loading || isLockedOut"
              class="w-full rounded-xl font-bold py-3 text-sm text-white transition mt-2 flex items-center justify-center gap-2"
              [style.background]="isLockedOut ? '#dc2626' : 'linear-gradient(135deg,#1d4ed8,#0ea5e9)'"
              [style.opacity]="(loading || isLockedOut) ? '0.75' : '1'"
              [style.cursor]="(loading || isLockedOut) ? 'not-allowed' : 'pointer'"
            >
              <ng-container *ngIf="isLockedOut">
                <i class="fas fa-lock text-xs"></i>
                <span>Locked — {{ lockedOutSecs() }}s</span>
              </ng-container>
              <ng-container *ngIf="!isLockedOut && !loading">
                <i class="fas fa-right-to-bracket text-xs"></i>
                <span>{{ 'app.signIn' | t }}</span>
              </ng-container>
              <ng-container *ngIf="!isLockedOut && loading">
                <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span>{{ 'app.signingIn' | t }}</span>
              </ng-container>
            </button>
          </form>

          

          <!-- footer -->
          <p class="text-center text-xs mt-5" style="color:#475569">
            Smart IoT Gate System &copy; {{ year }}
          </p>
        </div>

      </div>
    </div>
  `,
})
export class LoginComponent implements OnDestroy {
  email    = 'admin@tollgate.iot';
  password = 'Admin@123456';
  loading  = false;
  year     = new Date().getFullYear();

  showPassword   = signal(false);
  lockedOutSecs  = signal(0);

  private _countdownTimer: ReturnType<typeof setInterval> | null = null;

  readonly i18n  = inject(I18nService);
  readonly theme = inject(ThemeService);

  constructor(
    private readonly auth:     AuthService,
    private readonly router:   Router,
    private readonly feedback: FeedbackService,
  ) {}

  ngOnDestroy(): void {
    if (this._countdownTimer) clearInterval(this._countdownTimer);
  }

  get isLockedOut(): boolean { return this.lockedOutSecs() > 0; }

  private _startCountdown(seconds: number): void {
    if (this._countdownTimer) clearInterval(this._countdownTimer);
    this.lockedOutSecs.set(seconds);
    this._countdownTimer = setInterval(() => {
      const remaining = this.lockedOutSecs() - 1;
      if (remaining <= 0) {
        this.lockedOutSecs.set(0);
        clearInterval(this._countdownTimer!);
        this._countdownTimer = null;
      } else {
        this.lockedOutSecs.set(remaining);
      }
    }, 1000);
  }

  submit(): void {
    if (this.isLockedOut || this.loading) return;
    if (!this.email || !this.password) {
      this.feedback.errorToast(this.i18n.t('login.requiredError'));
      return;
    }
    this.loading = true;
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (user) => {
        this.loading = false;
        this.feedback.successToast(
          `${this.i18n.t('login.welcome')}, ${user.fullName}.`,
          this.i18n.t('login.success'),
        );
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading = false;
        if (error?.status === 429) {
          const secs = error?.error?.retryAfterSeconds ?? 900;
          this._startCountdown(secs);
          this.feedback.errorToast(error?.error?.message, 'Too many attempts');
        } else {
          const message = error?.error?.message || this.i18n.t('login.failed');
          this.feedback.errorToast(message, this.i18n.t('login.authError'));
        }
      },
    });
  }
}
