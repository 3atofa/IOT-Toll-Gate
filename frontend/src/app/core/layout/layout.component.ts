import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { FeedbackService } from '../services/feedback.service';
import { RealtimeService } from '../services/realtime.service';
import { I18nService } from '../services/i18n.service';
import { ThemeService } from '../services/theme.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { SecurityAlert } from '../models/security.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <div class="flex h-dvh overflow-hidden" [class.bg-slate-100]="!theme.isDark()" [class.bg-slate-950]="theme.isDark()">
      <!-- Mobile drawer backdrop -->
      <div
        *ngIf="drawerOpen"
        (click)="closeDrawer()"
        class="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
      ></div>

      <!-- ═══ Sidebar ═══════════════════════════════════════════ -->
      <aside
        class="fixed inset-y-0 z-40 w-72 max-w-[85vw] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out lg:static lg:inset-auto lg:w-64 lg:translate-x-0"
        style="background: linear-gradient(180deg, #070d1c 0%, #0c1628 45%, #0f172a 100%)"
        [class.translate-x-0]="drawerOpen"
        [class.-translate-x-full]="!drawerOpen && !i18n.isRtl()"
        [class.translate-x-full]="!drawerOpen && i18n.isRtl()"
        [style.left]="i18n.isRtl() ? 'auto' : '0'"
        [style.right]="i18n.isRtl() ? '0' : 'auto'"
      >
        <!-- Brand -->
        <div class="px-4 pt-5 pb-4 border-b border-white/[0.07] flex items-center justify-between gap-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); box-shadow: 0 4px 14px rgba(59,130,246,0.45)">
              <i class="fas fa-gate-open text-white text-sm"></i>
            </div>
            <div class="min-w-0">
              <h1 class="text-sm font-bold text-white truncate leading-tight">{{ 'app.title' | t }}</h1>
              <p class="text-[11px] font-medium truncate" style="color: rgba(96,165,250,0.8)">{{ 'app.subtitle' | t }}</p>
            </div>
          </div>
          <button type="button" (click)="closeDrawer()"
            class="lg:hidden text-slate-400 hover:text-white w-8 h-8 rounded-lg hover:bg-white/10 transition flex items-center justify-center flex-shrink-0"
            [attr.aria-label]="'app.close' | t">
            <i class="fas fa-times text-sm"></i>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">

          <!-- Main section -->
          <p class="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style="color: rgba(148,163,184,0.55)">{{ 'nav.main' | t }}</p>

          <a routerLink="/dashboard" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: true }"
             (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(59,130,246,0.12); color: #60a5fa"><i class="fas fa-chart-line"></i></span>
            <span class="nav-label">{{ 'nav.dashboard' | t }}</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/gate-control" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(34,197,94,0.12); color: #4ade80"><i class="fas fa-lock"></i></span>
            <span class="nav-label">{{ 'nav.gateControl' | t }}</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/vehicles" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(251,191,36,0.12); color: #fbbf24"><i class="fas fa-car"></i></span>
            <span class="nav-label">{{ 'nav.vehicles' | t }}</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/cards" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(34,197,94,0.12); color: #4ade80"><i class="fas fa-money-bill-wave"></i></span>
            <span class="nav-label">{{ 'nav.cards' | t }}</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/captures" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(248,113,113,0.12); color: #f87171"><i class="fas fa-image"></i></span>
            <span class="nav-label">{{ 'nav.captures' | t }}</span>
            <span class="nav-indicator"></span>
          </a>

          <!-- Security section -->
          <p class="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style="color: rgba(148,163,184,0.55)">{{ 'nav.security' | t }}</p>

          <a routerLink="/wanted-persons" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(244,63,94,0.12); color: #fb7185"><i class="fas fa-user-secret"></i></span>
            <span class="nav-label">{{ 'nav.wantedPersons' | t }}</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/wanted-cars" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(249,115,22,0.12); color: #fb923c"><i class="fas fa-triangle-exclamation"></i></span>
            <span class="nav-label">{{ 'nav.wantedCars' | t }}</span>
            <span class="nav-indicator"></span>
          </a>

          <!-- Operations section -->
          <p class="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style="color: rgba(148,163,184,0.55)">Operations</p>

          <a routerLink="/incidents" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(245,158,11,0.12); color: #fbbf24"><i class="fas fa-circle-exclamation"></i></span>
            <span class="nav-label">Gate Incidents</span>
            <span class="nav-indicator"></span>
          </a>

          <!-- Staff section -->
          <p class="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style="color: rgba(148,163,184,0.55)">Staff</p>

          <a routerLink="/technicians" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(139,92,246,0.12); color: #a78bfa"><i class="fas fa-helmet-safety"></i></span>
            <span class="nav-label">Technicians</span>
            <span class="nav-indicator"></span>
          </a>

          <!-- Admin section -->
          <p class="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style="color: rgba(148,163,184,0.55)">{{ 'nav.admin' | t }}</p>

          <a routerLink="/reports" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(99,102,241,0.12); color: #a5b4fc"><i class="fas fa-file-alt"></i></span>
            <span class="nav-label">{{ 'nav.reports' | t }}</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/users" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(34,211,238,0.12); color: #22d3ee"><i class="fas fa-users"></i></span>
            <span class="nav-label">{{ 'nav.users' | t }}</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/settings" routerLinkActive="nav-active" (click)="closeDrawer()" class="sidebar-nav-item">
            <span class="nav-icon" style="background: rgba(148,163,184,0.1); color: #94a3b8"><i class="fas fa-cog"></i></span>
            <span class="nav-label">{{ 'nav.settings' | t }}</span>
            <span class="nav-indicator"></span>
          </a>
        </nav>

        <!-- User footer -->
        <div class="p-4 border-t border-white/[0.07]">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                 style="background: linear-gradient(135deg, #3b82f6, #6366f1)">
              {{ currentUserInitials }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-white truncate leading-tight">{{ currentUserName }}</p>
              <p class="text-[11px] text-slate-400 capitalize truncate">{{ currentUserRole }}</p>
            </div>
          </div>
          <button type="button" (click)="logout()"
            class="w-full rounded-xl border border-white/10 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center gap-2">
            <i class="fas fa-arrow-right-from-bracket text-xs"></i>
            {{ 'app.signOut' | t }}
          </button>
        </div>
      </aside>

      <!-- ═══ Main Content ══════════════════════════════════════ -->
      <main class="flex-1 min-w-0 h-full flex flex-col overflow-hidden">

        <!-- Top Header Bar -->
        <header class="border-b px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 z-20 flex-shrink-0"
                style="background: rgba(255,255,255,0.97); backdrop-filter: blur(8px); border-color: #e2e8f0">
          <!-- Mobile burger -->
          <button type="button" (click)="openDrawer()"
            class="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            [attr.aria-label]="'app.menu' | t">
            <i class="fas fa-bars-staggered text-base"></i>
          </button>

          <!-- Title -->
          <div class="min-w-0 flex-1">
            <h2 class="text-sm sm:text-base font-bold text-slate-800 truncate leading-tight">{{ 'app.headerTitle' | t }}</h2>
            <div class="hidden sm:flex items-center gap-2 mt-0.5">
              <span class="live-dot"></span>
              <span class="text-xs text-slate-500">{{ 'app.online' | t }} &middot; {{ currentTime | date:'shortTime' }}</span>
            </div>
          </div>

          <!-- Right controls -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Search -->
            <a routerLink="/search"
              class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition">
              <i class="fas fa-magnifying-glass text-slate-400 text-xs"></i>
              <span class="hidden sm:inline">Search</span>
            </a>

            <!-- Lang -->
            <button type="button" (click)="toggleLang()"
              class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
              [attr.aria-label]="'app.language' | t">
              <i class="fas fa-globe text-slate-400 text-xs"></i>
              <span>{{ i18n.lang() === 'en' ? 'العربية' : 'English' }}</span>
            </button>

            <!-- Dark mode -->
            <button type="button" (click)="theme.toggle()"
              class="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition"
              [attr.aria-label]="(theme.isDark() ? 'app.lightMode' : 'app.darkMode') | t">
              <i class="fas text-sm" [ngClass]="theme.isDark() ? 'fa-sun text-amber-400' : 'fa-moon'"></i>
            </button>

            <!-- Bell -->
            <button class="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm relative">
              <i class="fas fa-bell text-sm"></i>
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
  styles: [`:host { display: block; }

  /* Dark-mode header override */
  :host-context(html.dark) header {
    background: rgba(15,23,42,0.97) !important;
    border-color: #1e293b !important;
  }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentTime = new Date();
  currentUserName = 'Admin User';
  currentUserRole = 'admin';
  drawerOpen = false;

  get currentUserInitials(): string {
    return this.currentUserName
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  readonly i18n  = inject(I18nService);
  readonly theme  = inject(ThemeService);

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
