import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CapturesComponent } from './features/captures/captures.component';

import { LayoutComponent } from './core/layout/layout.component';
import { GateControlComponent } from './features/gate-control/gate-control.component';
import { VehiclesComponent } from './features/vehicles/vehicles.component';
import { CardsComponent } from './features/cards/cards.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'gate-control', component: GateControlComponent },
      { path: 'vehicles', component: VehiclesComponent },
      { path: 'cards', component: CardsComponent },
      { path: 'captures', component: CapturesComponent },
      { path: 'reports', component: DashboardComponent }, // Placeholder
      { path: 'settings', component: DashboardComponent }, // Placeholder
    ],
  },
  { path: '**', redirectTo: '' },
];
