import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
    <div class="min-h-screen bg-slate-950 text-white flex items-center justify-center p-3 sm:p-6">
      <!-- Top-right language switcher -->
      <button
        type="button"
        (click)="i18n.toggle()"
        class="fixed top-4 z-10 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition backdrop-blur"
        [style.right]="i18n.isRtl() ? 'auto' : '1rem'"
        [style.left]="i18n.isRtl() ? '1rem' : 'auto'"
        [attr.aria-label]="'app.language' | t"
      >
        <i class="fas fa-globe"></i>
        <span>{{ i18n.lang() === 'en' ? 'العربية' : 'English' }}</span>
      </button>
      <!-- Dark mode toggle -->
      <button
        type="button"
        (click)="theme.toggle()"
        class="fixed top-4 z-10 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 transition backdrop-blur"
        [style.right]="i18n.isRtl() ? 'auto' : '5.5rem'"
        [style.left]="i18n.isRtl() ? '5.5rem' : 'auto'"
        [attr.aria-label]="(theme.isDark() ? 'app.lightMode' : 'app.darkMode') | t"
      >
        <i class="fas" [ngClass]="theme.isDark() ? 'fa-sun text-amber-300' : 'fa-moon'"></i>
      </button>
      <div class="w-full max-w-5xl grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900">
        <div class="hidden md:flex flex-col justify-between p-8 lg:p-10 bg-gradient-to-br from-blue-700 via-slate-900 to-slate-950">
          <div>
            <div class="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/10">
              <i class="fas fa-shield-halved text-blue-300"></i>
              <span class="text-sm">{{ 'login.heroBadge' | t }}</span>
            </div>
            <h1 class="text-3xl lg:text-4xl font-black mt-8 leading-tight">{{ 'login.heroTitle' | t }}</h1>
            <p class="text-slate-300 mt-4 text-base lg:text-lg max-w-md">{{ 'login.heroDesc' | t }}</p>
          </div>
          <div class="space-y-3 text-slate-300 text-sm mt-8">
            <p><i class="fas fa-circle-check text-emerald-400 me-2"></i> {{ 'login.feat1' | t }}</p>
            <p><i class="fas fa-circle-check text-emerald-400 me-2"></i> {{ 'login.feat2' | t }}</p>
            <p><i class="fas fa-circle-check text-emerald-400 me-2"></i> {{ 'login.feat3' | t }}</p>
          </div>
        </div>

        <div class="bg-white text-slate-800 p-6 sm:p-8 md:p-12">
          <div class="max-w-md mx-auto">
            <div class="mb-6 sm:mb-8">
              <p class="text-sm font-semibold text-blue-700 uppercase tracking-[0.25em]">{{ 'login.portal' | t }}</p>
              <h2 class="text-2xl sm:text-3xl font-black mt-2">{{ 'login.title' | t }}</h2>
              <p class="text-slate-500 mt-2 text-sm sm:text-base">{{ 'login.subtitle' | t }}</p>
            </div>

            <form class="space-y-4 sm:space-y-5" (ngSubmit)="submit()">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">{{ 'login.email' | t }}</label>
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
                <label class="block text-sm font-semibold text-slate-700 mb-2">{{ 'login.password' | t }}</label>
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
                <span *ngIf="!loading">{{ 'app.signIn' | t }}</span>
                <span *ngIf="loading">{{ 'app.signingIn' | t }}</span>
              </button>
            </form>

            <div class="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
              <p class="font-semibold text-slate-700 mb-2">{{ 'login.demoTitle' | t }}</p>
              <p>{{ 'login.email' | t }}: admin&#64;tollgate.iot</p>
              <p>{{ 'login.password' | t }}: Admin&#64;123456</p>
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

  readonly i18n  = inject(I18nService);
  readonly theme  = inject(ThemeService);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly feedback: FeedbackService
  ) {}

  submit(): void {
    if (!this.email || !this.password) {
      this.feedback.errorToast(this.i18n.t('login.requiredError'));
      return;
    }

    this.loading = true;
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (user) => {
        this.loading = false;
        this.feedback.successToast(`${this.i18n.t('login.welcome')}, ${user.fullName}.`, this.i18n.t('login.success'));
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading = false;
        const message = error?.error?.message || this.i18n.t('login.failed');
        this.feedback.errorToast(message, this.i18n.t('login.authError'));
      },
    });
  }
}
