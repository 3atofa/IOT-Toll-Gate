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

// ─── Traffic Report ───────────────────────────────────────────────
export interface GateEventRow  { gateId: string; eventType: string; count: string; }
export interface HourRow       { hour: string; count: string; }
export interface DayRow        { day: string; count: string; }
export interface TopPlateRow   { plateText: string; count: string; }

export interface TrafficReport {
  byGateEvent: GateEventRow[];
  byHour:      HourRow[];
  byDay:       DayRow[];
  topPlates:   TopPlateRow[];
}

// ─── Security Report ──────────────────────────────────────────────
export interface TypeRow     { alertType: string; count: string; }
export interface DecisionRow { decision: string; count: string; }

export interface SecurityReport {
  byType:       TypeRow[];
  byDecision:   DecisionRow[];
  recentAlerts: SecurityAlert[];
  blockedCount: number;
  reviewCount:  number;
}

// ─── ALPR Report ──────────────────────────────────────────────────
export interface OcrStatusRow { ocrStatus: string; count: string; }

export interface AlprReport {
  byOcrStatus:       OcrStatusRow[];
  withPlate:         number;
  withoutPlate:      number;
  withFace:          number;
  withoutFace:       number;
  avgPlateConfidence: string | null;
  confidenceBuckets: { low: number; medium: number; high: number; veryHigh: number; };
  recentPlates:      Partial<GateCapture>[];
}

// ─── Financial Report ─────────────────────────────────────────────
export interface GateRevenue {
  gateId: string;
  count: number;
  feePerPass: number;
  revenue: number;
}

export interface DailyRevenue {
  day: string;
  gateId: string;
  count: number;
  revenue: number;
}

export interface FinancialReport {
  dateRange: { startDate: string | null; endDate: string | null; months: number; };
  revenue: {
    total: number;
    byGate: GateRevenue[];
    dailyTrend: DailyRevenue[];
  };
  expenses: {
    repairTotal: number;
    incidentCount: number;
    resolvedCount: number;
    staffMonthlyCost: number;
    staffPeriodCost: number;
    activeTechCount: number;
    total: number;
  };
  netPnL: number;
}

// ─── Incidents Report ─────────────────────────────────────────────
export interface IncidentsReport {
  dateRange: { startDate: string | null; endDate: string | null; };
  totals: { total: number; open: number; inProgress: number; resolved: number; };
  totalRepairCost: number;
  avgResolutionHours: number | null;
  bySeverity: { severity: string; count: string }[];
  byGate: { gateId: string; count: string }[];
  recentIncidents: any[];
}
