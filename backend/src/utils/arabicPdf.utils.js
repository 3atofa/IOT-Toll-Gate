/**
 * arabicPdf.utils.js
 *
 * Core drawing primitives for bilingual (Arabic / English) PDF generation.
 *
 * Arabic pitfalls handled here (as documented in ARABIC_DOCUMENTS.md):
 *   1. Disconnected Arabic letters  → features: ['rtla','liga','dlig'] on every text call
 *   2. Mixed Bidi text reversed     → prepend Unicode RLM (U+200F) on Latin-first mixed strings
 *   3. Eastern Arabic numerals      → always use en-GB locale for dates
 *   4. Columns in wrong order       → physically mirror x-positions for RTL tables
 *   5. Font lost after page break   → setupFonts() called inside doc.on('pageAdded') handler
 */

'use strict';

const { hasArabicFonts, fontPath } = require('./arabicFonts');

// ── Page geometry ──────────────────────────────────────────────────────────
const A4W        = 595.28;
const A4H        = 841.89;
const ML         = 40;          // left margin
const MR         = 40;          // right margin
const CW         = A4W - ML - MR; // content width = 515.28 pt
const HEADER_H   = 88;
const FOOTER_H   = 28;
const CONTENT_TOP  = HEADER_H + 10;
const PAGE_BOTTOM  = A4H - FOOTER_H - 12;

// Unicode Right-to-Left Mark
const RLM = '‏';

// ── Arabic codepoint range ─────────────────────────────────────────────────
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

// ── Bidi fix ───────────────────────────────────────────────────────────────
/**
 * Prepend RLM to Latin-first strings that also contain Arabic codepoints.
 * This forces fontkit to resolve paragraph base direction as RTL so the Arabic
 * portion is not reversed.
 */
function fixBidiForRtl(text) {
  const s = String(text ?? '');
  if (!ARABIC_RE.test(s)) return s;          // no Arabic → nothing to fix
  if (!/[A-Za-z0-9]/.test(s)) return s;      // pure Arabic → fontkit handles it
  // Find first "strong" character
  const first = s.match(/[A-Za-z0-9؀-ۿ]/);
  if (!first) return s;
  if (ARABIC_RE.test(first[0])) return s;    // Arabic-first → already correct
  return RLM + s;                            // Latin-first → prepend RLM
}

// ── Date helpers (always en-GB to avoid Eastern Arabic numerals) ───────────
/**
 * Format a date as "07 Jun 2026" (en-GB, Western digits, works in all PDF viewers).
 */
function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: '2-digit',
    });
  } catch { return String(d).slice(0, 10); }
}

/**
 * Format a date-time as "07 Jun 2026, 14:30".
 */
function fmtDateTime(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(d); }
}

// ── Money formatter ────────────────────────────────────────────────────────
function fmtMoney(n) {
  return `EGP ${(+n || 0).toFixed(2)}`;
}

// ── Clip string to max characters ─────────────────────────────────────────
function clip(val, max) {
  const s = String(val ?? '—');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ── Font registration ──────────────────────────────────────────────────────
/**
 * Register fonts on `doc`.  Must be called:
 *   - Once after doc creation
 *   - Again inside doc.on('pageAdded') to survive page breaks
 */
function setupFonts(doc, lang) {
  if (lang === 'ar' && hasArabicFonts()) {
    doc.registerFont('body', fontPath('Amiri-Regular.ttf'));
    doc.registerFont('bold', fontPath('Amiri-Bold.ttf'));
    doc._arabicReady = true;
  } else {
    doc.registerFont('body', 'Helvetica');
    doc.registerFont('bold', 'Helvetica-Bold');
    doc._arabicReady = false;
  }
  doc.registerFont('mono', 'Courier');
}

// ── Low-level text helper ──────────────────────────────────────────────────
/**
 * Write text at (x, y) with automatic Arabic shaping + bidi fix.
 * All Arabic text calls funnel through here.
 */
function txt(doc, text, x, y, opts, lang) {
  const s         = lang === 'ar' ? fixBidiForRtl(text) : String(text ?? '');
  const features  = (lang === 'ar' && doc._arabicReady) ? ['rtla', 'liga', 'dlig'] : undefined;
  const align     = opts?.align ?? (lang === 'ar' ? 'right' : 'left');
  const merged    = { ...opts, align, features, lineBreak: opts?.lineBreak ?? false };

  if (x !== undefined && y !== undefined) {
    doc.text(s, x, y, merged);
  } else {
    doc.text(s, merged);
  }
}

// ── Brand palette ──────────────────────────────────────────────────────────
const BRAND = {
  text:    '#111827',
  muted:   '#6b7280',
  line:    '#d1d5db',
  surface: '#f9fafb',
  white:   '#ffffff',
};

// ── Per-report color themes ────────────────────────────────────────────────
const THEMES = {
  summary:   { header: '#1e3a8a', accent: '#bfdbfe', table: '#1d4ed8', kpi: '#1d4ed8', kpiAlt: '#2563eb' },
  traffic:   { header: '#0c4a6e', accent: '#bae6fd', table: '#0369a1', kpi: '#0891b2', kpiAlt: '#0284c7' },
  security:  { header: '#7f1d1d', accent: '#fecaca', table: '#b91c1c', kpi: '#dc2626', kpiAlt: '#ef4444' },
  alpr:      { header: '#4c1d95', accent: '#ddd6fe', table: '#6d28d9', kpi: '#7c3aed', kpiAlt: '#8b5cf6' },
  financial: { header: '#14532d', accent: '#bbf7d0', table: '#15803d', kpi: '#059669', kpiAlt: '#10b981' },
  incidents: { header: '#78350f', accent: '#fde68a', table: '#b45309', kpi: '#d97706', kpiAlt: '#f59e0b' },
};

// ── Bilingual label dictionary ─────────────────────────────────────────────
const LABELS = {
  en: {
    // System / titles
    systemName:       'Intelligent Toll Gate System',
    summaryTitle:     'System Summary Report',
    trafficTitle:     'Traffic Analysis Report',
    securityTitle:    'Security Report',
    alprTitle:        'ALPR Performance Report',
    financialTitle:   'Financial & Operations Report',
    incidentsTitle:   'Incidents Report',
    fullTitle:        'Full System Report',
    // Meta
    page:             'Page',
    generatedBy:      'Generated by',
    period:           'Period',
    allTime:          'All time',
    confidential:     'CONFIDENTIAL',
    // Columns
    gate:             'Gate',
    eventType:        'Event Type',
    count:            'Count',
    capturedAt:       'Captured At',
    plate:            'Plate',
    face:             'Face',
    decision:         'Decision',
    alertType:        'Alert Type',
    reason:           'Reason',
    hour:             'Hour',
    date:             'Date',
    captures:         'Captures',
    rank:             'Rank',
    occurrences:      'Occurrences',
    ocrStatus:        'OCR Status',
    confidence:       'Confidence',
    confidenceRange:  'Confidence Range',
    passes:           'Passes',
    feePerPass:       'Fee / Pass',
    revenue:          'Revenue',
    category:         'Category',
    detail:           'Detail',
    amount:           'Amount',
    reportedAt:       'Reported At',
    title:            'Title',
    severity:         'Severity',
    status:           'Status',
    repairCost:       'Repair Cost',
    technician:       'Technician',
    // KPI labels
    totalCaptures:    'Total Captures',
    accessGranted:    'Access Granted',
    accessDenied:     'Access Denied',
    securityAlerts:   'Security Alerts',
    secChecks:        'Security Checks',
    regVehicles:      'Reg. Vehicles',
    authCards:        'Auth. Cards',
    blocked:          'Blocked',
    underReview:      'Under Review',
    totalAlerts:      'Total Alerts',
    platesDetected:   'Plates Detected',
    plateDetRate:     'Detection Rate',
    facesDetected:    'Faces Detected',
    avgConfidence:    'Avg Confidence',
    totalRevenue:     'Total Revenue',
    repairExpenses:   'Repair Expenses',
    staffCosts:       'Staff Costs',
    netPnL:           'Net P&L',
    totalIncidents:   'Total Incidents',
    open:             'Open',
    inProgress:       'In Progress',
    resolved:         'Resolved',
    // Section headings
    recentCaptures:   'Recent Captures (Last 10)',
    recentAlerts:     'Recent Security Alerts',
    gateBreakdown:    'Gate & Event Breakdown',
    topPlates:        'Top 10 Most Frequent Plates',
    hourlyDist:       'Hourly Distribution',
    dailyTrend:       'Daily Trend',
    alertsByType:     'Alerts by Type',
    alertsByDecision: 'Alerts by Decision',
    alertDetails:     'Alert Details (Last 30)',
    ocrBreakdown:     'OCR Status Breakdown',
    confBuckets:      'Confidence Score Buckets',
    recentPlates:     'Recent Plates with OCR Data',
    passRevenue:      'Gate Pass Revenue',
    expenseBreakdown: 'Expense Breakdown',
    incidentsOverview:'Incidents Overview',
    bySeverity:       'By Severity',
    incidentLog:      'Incident Log (Last 50)',
    // Financial sub-labels
    repairMaint:      'Repair / Maintenance',
    staffSalaries:    'Staff Salaries',
    totalExpenses:    'Total Expenses',
    months:           'month(s)',
    activeTechs:      'active technicians',
    incidents_:       'incidents',
    resolved_:        'resolved',
  },

  ar: {
    // System / titles
    systemName:       'نظام بوابات العبور الذكي',
    summaryTitle:     'تقرير ملخص النظام',
    trafficTitle:     'تقرير تحليل حركة المرور',
    securityTitle:    'تقرير الأمان',
    alprTitle:        'تقرير أداء نظام التعرف على اللوحات',
    financialTitle:   'التقرير المالي والتشغيلي',
    incidentsTitle:   'تقرير الحوادث',
    fullTitle:        'التقرير الشامل للنظام',
    // Meta
    page:             'صفحة',
    generatedBy:      'أنشأه',
    period:           'الفترة',
    allTime:          'كل الوقت',
    confidential:     'سري',
    // Columns
    gate:             'البوابة',
    eventType:        'نوع الحدث',
    count:            'العدد',
    capturedAt:       'وقت التصوير',
    plate:            'اللوحة',
    face:             'الوجه',
    decision:         'القرار',
    alertType:        'نوع التنبيه',
    reason:           'السبب',
    hour:             'الساعة',
    date:             'التاريخ',
    captures:         'التصويرات',
    rank:             'الترتيب',
    occurrences:      'مرات الظهور',
    ocrStatus:        'حالة التعرف الضوئي',
    confidence:       'درجة الثقة',
    confidenceRange:  'نطاق الثقة',
    passes:           'المرورات',
    feePerPass:       'رسوم المرور',
    revenue:          'الإيرادات',
    category:         'الفئة',
    detail:           'التفاصيل',
    amount:           'المبلغ',
    reportedAt:       'تاريخ الإبلاغ',
    title:            'العنوان',
    severity:         'الخطورة',
    status:           'الحالة',
    repairCost:       'تكلفة الإصلاح',
    technician:       'الفني',
    // KPI labels
    totalCaptures:    'إجمالي التصويرات',
    accessGranted:    'دخول مسموح',
    accessDenied:     'دخول مرفوض',
    securityAlerts:   'تنبيهات أمنية',
    secChecks:        'فحوصات أمنية',
    regVehicles:      'المركبات المسجلة',
    authCards:        'البطاقات المخوّلة',
    blocked:          'محجوب',
    underReview:      'قيد المراجعة',
    totalAlerts:      'إجمالي التنبيهات',
    platesDetected:   'لوحات مكتشفة',
    plateDetRate:     'معدل الاكتشاف',
    facesDetected:    'وجوه مكتشفة',
    avgConfidence:    'متوسط الثقة',
    totalRevenue:     'إجمالي الإيرادات',
    repairExpenses:   'نفقات الإصلاح',
    staffCosts:       'تكاليف الموظفين',
    netPnL:           'صافي الأرباح والخسائر',
    totalIncidents:   'إجمالي الحوادث',
    open:             'مفتوح',
    inProgress:       'قيد التنفيذ',
    resolved:         'محلول',
    // Section headings
    recentCaptures:   'آخر التصويرات',
    recentAlerts:     'آخر التنبيهات الأمنية',
    gateBreakdown:    'تفاصيل البوابات والأحداث',
    topPlates:        'أكثر 10 لوحات تكراراً',
    hourlyDist:       'التوزيع بالساعة',
    dailyTrend:       'الاتجاه اليومي',
    alertsByType:     'التنبيهات حسب النوع',
    alertsByDecision: 'التنبيهات حسب القرار',
    alertDetails:     'تفاصيل التنبيهات (آخر 30)',
    ocrBreakdown:     'تحليل حالة التعرف الضوئي',
    confBuckets:      'نطاقات درجة الثقة',
    recentPlates:     'آخر اللوحات المرصودة',
    passRevenue:      'إيرادات رسوم المرور',
    expenseBreakdown: 'تفاصيل المصروفات',
    incidentsOverview:'نظرة عامة على الحوادث',
    bySeverity:       'حسب الخطورة',
    incidentLog:      'سجل الحوادث (آخر 50)',
    // Financial sub-labels
    repairMaint:      'الإصلاح والصيانة',
    staffSalaries:    'رواتب الموظفين',
    totalExpenses:    'إجمالي المصروفات',
    months:           'شهر/أشهر',
    activeTechs:      'فنيين نشطين',
    incidents_:       'حادثة',
    resolved_:        'محلولة',
  },
};

// ── Page header ────────────────────────────────────────────────────────────
/**
 * Draw the full-width header band on the current page.
 * Uses state.pageNum which is already correct (incremented in pageAdded handler).
 */
function drawPageHeader(doc, state) {
  const L     = LABELS[state.lang];
  const isRtl = state.lang === 'ar';
  const theme = state.theme;

  // Background band
  doc.rect(0, 0, A4W, HEADER_H).fill(theme.header);

  // Thin accent stripe
  doc.rect(0, HEADER_H - 4, A4W, 4).fill(theme.accent + '44');

  // System name (large)
  doc.fillColor('#ffffff').fontSize(13).font('bold');
  txt(doc, L.systemName, ML, 12, { width: CW, lineBreak: false }, state.lang);

  // Report title
  doc.fillColor(theme.accent).fontSize(10).font('body');
  txt(doc, state.title, ML, 32, { width: CW, lineBreak: false }, state.lang);

  // Generated-by line
  const metaText = `${L.generatedBy}: ${state.user?.fullName || '—'}  ·  ${fmtDateTime(new Date())}`;
  doc.fillColor('#cccccc').fontSize(7).font('body');
  txt(doc, metaText, ML, 52, { width: CW, align: isRtl ? 'right' : 'left', lineBreak: false }, state.lang);

  // Page number (top-right for LTR, top-left for RTL)
  const pageText = `${L.page} ${state.pageNum}`;
  doc.fillColor('#aaaaaa').fontSize(7).font('body');
  txt(doc, pageText, ML, 68, { width: CW, align: isRtl ? 'left' : 'right', lineBreak: false }, state.lang);

  // Reset cursor
  doc.fillColor(BRAND.text).font('body').fontSize(9);
}

// ── Page footer ────────────────────────────────────────────────────────────
function drawFooter(doc, state) {
  const L    = LABELS[state.lang];
  const lineY = A4H - FOOTER_H;

  doc.moveTo(ML, lineY).lineTo(A4W - MR, lineY)
    .lineWidth(0.5).stroke(BRAND.line);

  doc.fillColor(BRAND.muted).fontSize(7).font('body');
  const footText = `${L.systemName}  ·  ${L.page} ${state.pageNum}  ·  ${L.confidential}`;
  txt(doc, footText, ML, lineY + 6, { width: CW, align: 'center', lineBreak: false }, state.lang);
}

// ── Section heading bar ────────────────────────────────────────────────────
/**
 * Draw a full-width colored heading bar.
 * @returns {number} new y position (below the bar)
 */
function drawSection(doc, title, y, state) {
  const BAR_H = 18;
  doc.rect(ML, y, CW, BAR_H).fill(state.theme.table);
  doc.fillColor('#ffffff').fontSize(9).font('bold');
  txt(doc, title, ML + 6, y + 5, { width: CW - 12, lineBreak: false }, state.lang);
  doc.fillColor(BRAND.text).font('body').fontSize(9);
  return y + BAR_H + 6;
}

// ── KPI cards row ──────────────────────────────────────────────────────────
/**
 * Draw a row of metric cards.
 * @param {Array<{label:string, value:string|number, color?:string}>} items
 * @returns {number} new y position
 */
function drawKpiCards(doc, items, y, state) {
  const GAP    = 5;
  const CARD_H = 54;
  const n      = items.length;
  const cardW  = (CW - GAP * (n - 1)) / n;
  const theme  = state.theme;

  // RTL: reverse visual order so "first" KPI is on the right
  const vis = state.lang === 'ar' ? [...items].reverse() : items;

  vis.forEach((item, i) => {
    const cx = ML + i * (cardW + GAP);

    // Card fill
    doc.rect(cx, y, cardW, CARD_H).fill(item.color || theme.kpi);

    // Gold accent stripe at top
    doc.rect(cx, y, cardW, 3).fillOpacity(0.4).fill('#ffffff').fillOpacity(1);

    // Value
    doc.fillColor('#ffffff').fontSize(18).font('bold');
    doc.text(String(item.value), cx + 4, y + 10,
      { width: cardW - 8, align: 'center', lineBreak: false });

    // Label (via txt() for Arabic shaping)
    doc.fillColor('#ffffffcc').fontSize(7).font('body');
    txt(doc, item.label, cx + 4, y + 35,
      { width: cardW - 8, align: 'center', lineBreak: false }, state.lang);
  });

  doc.fillColor(BRAND.text).font('body').fontSize(9);
  return y + CARD_H + 8;
}

// ── Table ──────────────────────────────────────────────────────────────────
/**
 * Draw a data table with automatic pagination.
 *
 * For RTL: reverses both header labels and row cell order so the
 * physically-rightmost column is logically "first".  Column widths are
 * reversed in the same way so proportions are preserved.
 *
 * @param {string[]}   headers   - logical order (LTR: left→right / RTL: right→left)
 * @param {Array[]}    rows      - array of cell arrays, same logical order
 * @param {number[]}   colWidths - matching widths (must sum to ≤ CW)
 * @returns {number} new y position
 */
function drawTable(doc, headers, rows, colWidths, y, state) {
  const isRtl    = state.lang === 'ar';
  const theme    = state.theme;
  const ROW_H    = 17;
  const totalW   = colWidths.reduce((a, b) => a + b, 0);

  // Mirror column order for RTL
  const visH  = isRtl ? [...headers].reverse()   : headers;
  const visCW = isRtl ? [...colWidths].reverse() : colWidths;

  function renderHeader(ty) {
    doc.rect(ML, ty, totalW, ROW_H).fill(theme.table);
    let x = ML;
    visH.forEach((h, i) => {
      const hs = state.lang === 'ar' ? fixBidiForRtl(h) : String(h ?? '');
      const features = (state.lang === 'ar' && doc._arabicReady) ? ['rtla', 'liga', 'dlig'] : undefined;
      doc.fillColor('#ffffff').fontSize(7.5).font('bold');
      doc.text(hs, x + 3, ty + 5, {
        width: visCW[i] - 6,
        lineBreak: false,
        align: isRtl ? 'right' : 'left',
        features,
      });
      x += visCW[i];
    });
    return ty + ROW_H;
  }

  // Ensure room for at least header + 2 rows before starting
  y = checkPage(doc, y, ROW_H * 3, state);
  y = renderHeader(y);

  rows.forEach((row, ri) => {
    y = checkPage(doc, y, ROW_H, state);

    const bg = ri % 2 === 0 ? BRAND.white : BRAND.surface;
    doc.rect(ML, y, totalW, ROW_H).fill(bg);
    doc.rect(ML, y, totalW, ROW_H).lineWidth(0.4).stroke(BRAND.line);

    const visRow = isRtl ? [...row].reverse() : row;
    let x = ML;
    visRow.forEach((cell, ci) => {
      const cs = state.lang === 'ar'
        ? fixBidiForRtl(clip(cell, 40))
        : clip(cell, 40);
      const features = (state.lang === 'ar' && doc._arabicReady) ? ['rtla', 'liga', 'dlig'] : undefined;
      doc.fillColor(BRAND.text).fontSize(7.5).font('body');
      doc.text(cs, x + 3, y + 5, {
        width: visCW[ci] - 6,
        lineBreak: false,
        align: isRtl ? 'right' : 'left',
        features,
      });
      x += visCW[ci];
    });

    y += ROW_H;
  });

  doc.fillColor(BRAND.text).font('body').fontSize(9);
  return y + 6;
}

// ── Date range subtitle ────────────────────────────────────────────────────
function drawDateRange(doc, dr, y, state) {
  const L     = LABELS[state.lang];
  const start = dr?.startDate ? fmtDate(dr.startDate) : L.allTime;
  const end   = dr?.endDate   ? fmtDate(dr.endDate)   : L.allTime;
  const text  = `${L.period}: ${start} — ${end}`;
  doc.fillColor(BRAND.muted).fontSize(8).font('body');
  txt(doc, text, ML, y, { width: CW, lineBreak: false }, state.lang);
  return y + 14;
}

// ── Pagination check ───────────────────────────────────────────────────────
/**
 * If `y + needed` would overflow the page, draw the footer, add a new page,
 * re-register fonts (already done in pageAdded handler), draw header.
 * Returns the updated y cursor.
 */
function checkPage(doc, y, needed, state) {
  if (y + needed > PAGE_BOTTOM) {
    drawFooter(doc, state);
    doc.addPage();
    // pageAdded handler: setupFonts() + state.pageNum++ already ran
    drawPageHeader(doc, state);
    return CONTENT_TOP;
  }
  return y;
}

// ── exports ────────────────────────────────────────────────────────────────
module.exports = {
  // geometry
  A4W, A4H, ML, MR, CW,
  HEADER_H, FOOTER_H, CONTENT_TOP, PAGE_BOTTOM,
  // palettes
  BRAND, THEMES, LABELS,
  // text utilities
  fixBidiForRtl, fmtDate, fmtDateTime, fmtMoney, clip, txt,
  // document setup
  setupFonts,
  // drawing primitives
  drawPageHeader, drawFooter, drawSection, drawKpiCards, drawTable,
  drawDateRange, checkPage,
};
