import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-slate-100">
      <!-- Sidebar -->
      <aside class="w-64 bg-slate-900 text-white shadow-lg flex flex-col">
        <!-- Header -->
        <div class="p-6 border-b border-slate-700">
          <h1 class="text-2xl font-bold flex items-center gap-3">
            <i class="fas fa-gate-open text-blue-400"></i>
            <span>Toll Gate IoT</span>
          </h1>
          <p class="text-sm text-slate-400 mt-2">Management System</p>
        </div>

        <!-- Navigation Menu -->
        <nav class="flex-1 px-4 py-6 space-y-2">
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
            routerLink="/reports"
            routerLinkActive="bg-blue-600"
            class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <i class="fas fa-file-alt text-indigo-400"></i>
            <span>Reports</span>
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
            <span>Admin User</span>
          </p>
          <p class="text-xs mt-2 opacity-70">v1.0 | 2024</p>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden">
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
        <div class="flex-1 overflow-auto">
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
export class LayoutComponent {
  currentTime = new Date();

  constructor() {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }
}
