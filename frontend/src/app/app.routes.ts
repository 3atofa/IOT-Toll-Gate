import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CapturesComponent } from './features/captures/captures.component';

import { LayoutComponent } from './core/layout/layout.component';
import { GateControlComponent } from './features/gate-control/gate-control.component';
import { VehiclesComponent } from './features/vehicles/vehicles.component';
import { CardsComponent } from './features/cards/cards.component';
import { WantedCarsComponent } from './features/wanted-cars/wanted-cars.component';
import { WantedPersonsComponent } from './features/wanted-persons/wanted-persons.component';
import { ReportsComponent } from './features/reports/reports.component';
import { LoginComponent } from './features/auth/login.component';
import { UsersComponent } from './features/users/users.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'gate-control', component: GateControlComponent },
      { path: 'vehicles', component: VehiclesComponent },
      { path: 'cards', component: CardsComponent },
      { path: 'wanted-persons', component: WantedPersonsComponent },
      { path: 'wanted-cars', component: WantedCarsComponent },
      { path: 'captures', component: CapturesComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'users', component: UsersComponent },
      { path: 'settings', component: DashboardComponent }, // Placeholder
    ],
  },
  { path: '**', redirectTo: '' },
];
