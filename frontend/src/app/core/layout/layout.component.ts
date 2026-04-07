import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { FeedbackService } from '../services/feedback.service';
import { RealtimeService } from '../services/realtime.service';
import { SecurityAlert } from '../models/security.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-dvh overflow-hidden bg-slate-100">
      <!-- Sidebar -->
      <aside class="w-64 h-full bg-slate-900 text-white shadow-lg flex flex-col overflow-hidden shrink-0">
        <!-- Header -->
        <div class="p-6 border-b border-slate-700">
          <h1 class="text-2xl font-bold flex items-center gap-3">
            <i class="fas fa-gate-open text-blue-400"></i>
            <span>Toll Gate IoT</span>
          </h1>
          <p class="text-sm text-slate-400 mt-2">Management System</p>
        </div>

        <!-- Navigation Menu -->
        <nav class="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-blue-600"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-chart-line text-blue-400"></i>
            <span>Dashboard</span>
          </a>

          <a
            routerLink="/gate-control"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-lock text-green-400"></i>
            <span>Gate Control</span>
          </a>

          <a
            routerLink="/vehicles"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-car text-yellow-400"></i>
            <span>Vehicles</span>
          </a>

          <a
            routerLink="/cards"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-id-card text-purple-400"></i>
            <span>RFID Cards</span>
          </a>

          <a
            routerLink="/captures"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-image text-red-400"></i>
            <span>Capture History</span>
          </a>

          <a
            routerLink="/wanted-persons"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-user-secret text-rose-400"></i>
            <span>Wanted Persons</span>
          </a>

          <a
            routerLink="/wanted-cars"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-triangle-exclamation text-orange-400"></i>
            <span>Wanted Cars</span>
          </a>

          <a
            routerLink="/reports"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-file-alt text-indigo-400"></i>
            <span>Reports</span>
          </a>

          <a
            routerLink="/users"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-users text-cyan-400"></i>
            <span>Users</span>
          </a>

          <a
            routerLink="/settings"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-cog text-slate-400"></i>
            <span>Settings</span>
          </a>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-700 text-sm text-slate-400">
          <p class="flex items-center gap-2">
            <i class="fas fa-user-circle"></i>
            <span>{{ currentUserName }}</span>
          </p>
          <p class="text-xs mt-1 opacity-70 capitalize">{{ currentUserRole }}</p>
          <button
            type="button"
            (click)="logout()"
            class="mt-3 w-full rounded-lg bg-slate-800 hover:bg-slate-700 transition py-2 text-sm text-white"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <!-- Header Bar -->
        <header class="bg-white border-b border-slate-200 px-8 py-4 shadow-sm flex justify-between items-center">
          <div>
            <h2 class="text-xl font-bold text-slate-800">Toll Gate Management</h2>
            <p class="text-sm text-slate-600">Professional Access Control System</p>
          </div>
          <div class="flex items-center gap-6">
            <div class="text-right">
              <p class="text-sm font-medium text-slate-700">Status: <span class="text-green-600">●</span> Online</p>
              <p class="text-xs text-slate-500">{{ currentTime | date:'short' }}</p>
            </div>
            <button class="w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">
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
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentTime = new Date();
  currentUserName = 'Admin User';
  currentUserRole = 'admin';
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
        this.feedback.errorToast(this.formatSecurityMessage(alert), 'Security Alert');
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
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private formatSecurityMessage(alert: SecurityAlert): string {
    if (alert.alertType === 'stolen_car') {
      return `Stolen car detected${alert.relatedPlate ? `: ${alert.relatedPlate}` : ''}`;
    }

    if (alert.alertType === 'wanted_person') {
      return `Wanted person detected${alert.relatedName ? `: ${alert.relatedName}` : ''}`;
    }

    return alert.reason || 'A blocked security event was detected.';
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
      // Ignore sound failures (browser autoplay permissions, device audio unavailable, etc.)
    }
  }
}
