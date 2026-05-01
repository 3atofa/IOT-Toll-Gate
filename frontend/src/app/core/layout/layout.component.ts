import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { FeedbackService } from '../services/feedback.service';
import { RealtimeService } from '../services/realtime.service';
import { I18nService } from '../services/i18n.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { SecurityAlert } from '../models/security.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <div class="flex h-dvh overflow-hidden bg-slate-100">
      <!-- Mobile drawer backdrop -->
      <div
        *ngIf="drawerOpen"
        (click)="closeDrawer()"
        class="fixed inset-0 z-30 bg-black/50 lg:hidden"
        aria-hidden="true"
      ></div>

      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 z-40 w-72 max-w-[85vw] bg-slate-900 text-white shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-in-out
               lg:static lg:inset-auto lg:w-64 lg:shadow-lg lg:translate-x-0"
        [class.translate-x-0]="drawerOpen"
        [class.-translate-x-full]="!drawerOpen && !i18n.isRtl()"
        [class.translate-x-full]="!drawerOpen && i18n.isRtl()"
        [style.left]="i18n.isRtl() ? 'auto' : '0'"
        [style.right]="i18n.isRtl() ? '0' : 'auto'"
      >
        <!-- Header -->
        <div class="p-5 border-b border-slate-700 flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h1 class="text-xl font-bold flex items-center gap-3">
              <i class="fas fa-gate-open text-blue-400"></i>
              <span class="truncate">{{ 'app.title' | t }}</span>
            </h1>
            <p class="text-xs text-slate-400 mt-1">{{ 'app.subtitle' | t }}</p>
          </div>
          <button
            type="button"
            (click)="closeDrawer()"
            class="lg:hidden text-slate-300 hover:text-white p-1"
            [attr.aria-label]="'app.close' | t"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Navigation Menu -->
        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <a routerLink="/dashboard" routerLinkActive="bg-blue-600" [routerLinkActiveOptions]="{ exact: true }"
             (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-chart-line text-blue-400 w-5 text-center"></i>
            <span>{{ 'nav.dashboard' | t }}</span>
          </a>
          <a routerLink="/gate-control" routerLinkActive="bg-blue-600" (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-lock text-green-400 w-5 text-center"></i>
            <span>{{ 'nav.gateControl' | t }}</span>
          </a>
          <a routerLink="/vehicles" routerLinkActive="bg-blue-600" (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-car text-yellow-400 w-5 text-center"></i>
            <span>{{ 'nav.vehicles' | t }}</span>
          </a>
          <a routerLink="/cards" routerLinkActive="bg-blue-600" (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-id-card text-purple-400 w-5 text-center"></i>
            <span>{{ 'nav.cards' | t }}</span>
          </a>
          <a routerLink="/captures" routerLinkActive="bg-blue-600" (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-image text-red-400 w-5 text-center"></i>
            <span>{{ 'nav.captures' | t }}</span>
          </a>
          <a routerLink="/wanted-persons" routerLinkActive="bg-blue-600" (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-user-secret text-rose-400 w-5 text-center"></i>
            <span>{{ 'nav.wantedPersons' | t }}</span>
          </a>
          <a routerLink="/wanted-cars" routerLinkActive="bg-blue-600" (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-triangle-exclamation text-orange-400 w-5 text-center"></i>
            <span>{{ 'nav.wantedCars' | t }}</span>
          </a>
          <a routerLink="/reports" routerLinkActive="bg-blue-600" (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-file-alt text-indigo-400 w-5 text-center"></i>
            <span>{{ 'nav.reports' | t }}</span>
          </a>
          <a routerLink="/users" routerLinkActive="bg-blue-600" (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-users text-cyan-400 w-5 text-center"></i>
            <span>{{ 'nav.users' | t }}</span>
          </a>
          <a routerLink="/settings" routerLinkActive="bg-blue-600" (click)="closeDrawer()"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
            <i class="fas fa-cog text-slate-400 w-5 text-center"></i>
            <span>{{ 'nav.settings' | t }}</span>
          </a>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-700 text-sm text-slate-400">
          <p class="flex items-center gap-2 truncate">
            <i class="fas fa-user-circle"></i>
            <span class="truncate">{{ currentUserName }}</span>
          </p>
          <p class="text-xs mt-1 opacity-70 capitalize">{{ currentUserRole }}</p>
          <button type="button" (click)="logout()"
            class="mt-3 w-full rounded-lg bg-slate-800 hover:bg-slate-700 transition py-2 text-sm text-white">
            {{ 'app.signOut' | t }}
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <!-- Header Bar -->
        <header class="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 shadow-sm flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            (click)="openDrawer()"
            class="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-700 hover:bg-slate-100"
            [attr.aria-label]="'app.menu' | t"
          >
            <i class="fas fa-bars text-lg"></i>
          </button>

          <div class="min-w-0 flex-1">
            <h2 class="text-base sm:text-xl font-bold text-slate-800 truncate">{{ 'app.headerTitle' | t }}</h2>
            <p class="hidden sm:block text-sm text-slate-600 truncate">{{ 'app.headerSubtitle' | t }}</p>
          </div>

          <div class="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              (click)="toggleLang()"
              class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              [attr.aria-label]="'app.language' | t"
              [title]="'app.language' | t"
            >
              <i class="fas fa-globe text-slate-500"></i>
              <span>{{ i18n.lang() === 'en' ? 'العربية' : 'English' }}</span>
            </button>

            <div class="hidden md:block text-right">
              <p class="text-xs sm:text-sm font-medium text-slate-700">
                {{ 'app.status' | t }}: <span class="text-green-600">●</span> {{ 'app.online' | t }}
              </p>
              <p class="text-[11px] sm:text-xs text-slate-500">{{ currentTime | date:'short' }}</p>
            </div>

            <button class="hidden sm:inline-flex w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition items-center justify-center">
              <i class="fas fa-bell"></i>
            </button>
          </div>
        </header>

        <!-- Page Content -->
        <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentTime = new Date();
  currentUserName = 'Admin User';
  currentUserRole = 'admin';
  drawerOpen = false;

  readonly i18n = inject(I18nService);

  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly realtime: RealtimeService,
    private readonly feedback: FeedbackService
  ) {
    const user = this.auth.currentUser;
    if (user) {
      this.currentUserName = user.fullName;
      this.currentUserRole = user.role;
    }

    this.clockTimer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnInit(): void {
    const alertSub = this.realtime.onSecurityAlert().subscribe({
      next: (alert) => {
        if (alert.decision !== 'block') {
          return;
        }
        this.playAlarmTone();
        this.feedback.errorToast(this.formatSecurityMessage(alert), this.i18n.t('alert.security'));
      },
    });
    this.subscriptions.add(alertSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    document.body.classList.remove('drawer-open');
  }

  toggleLang(): void {
    this.i18n.toggle();
  }

  openDrawer(): void {
    this.drawerOpen = true;
    document.body.classList.add('drawer-open');
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    document.body.classList.remove('drawer-open');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private formatSecurityMessage(alert: SecurityAlert): string {
    if (alert.alertType === 'stolen_car') {
      return `${this.i18n.t('alert.stolenCar')}${alert.relatedPlate ? `: ${alert.relatedPlate}` : ''}`;
    }
    if (alert.alertType === 'wanted_person') {
      return `${this.i18n.t('alert.wantedPerson')}${alert.relatedName ? `: ${alert.relatedName}` : ''}`;
    }
    return alert.reason || this.i18n.t('alert.blockedDefault');
  }

  private playAlarmTone(): void {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    try {
      const context = new AudioContextClass();
      const duration = 0.2;
      const gap = 0.08;
      const tones = [880, 660, 880];

      tones.forEach((frequency: number, index: number) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const startAt = context.currentTime + index * (duration + gap);
        const stopAt = startAt + duration;

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gainNode.gain.setValueAtTime(0.001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(0.15, startAt + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, stopAt);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(stopAt);
      });

      const totalTime = tones.length * (duration + gap) + 0.2;
      setTimeout(() => {
        context.close().catch(() => undefined);
      }, totalTime * 1000);
    } catch {
      /* ignore */
    }
  }
}
