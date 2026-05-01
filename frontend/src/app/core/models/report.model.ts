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
