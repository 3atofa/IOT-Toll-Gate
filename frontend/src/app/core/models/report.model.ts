import { GateCapture } from './gate-capture.model';
import { SecurityAlert } from './security.model';

export interface ReportTotals {
  totalCaptures: number;
  accessGranted: number;
  accessDenied: number;
  securityChecks: number;
  totalAlerts: number;
  totalVehicles: number;
  totalCards: number;
}

export interface ReportSummary {
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  totals: ReportTotals;
  recentCaptures: GateCapture[];
  recentAlerts: SecurityAlert[];
}
