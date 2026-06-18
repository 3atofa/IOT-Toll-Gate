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
 *
 * Arabic government/formal styling (when lang === 'ar'):
 *   • Header: gold top + bottom stripes, centered title, thin gold divider line
 *   • Footer: gold separator line (1.5 pt) + secondary thin line
 *   • Section bars: gold right-edge accent strip (4 pt)
 *   • Tables: full-grid vertical column dividers on header + every row
 *   • KPI cards: gold top stripe + subtle outer border
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

// ── Government gold accent colour (Arabic formal style) ───────────────────
const GOLD = '#c8a84b';

// ── Per-report color themes ────────────────────────────────────────────────
const THEMES = {
  summary:   { header: '#0f172a', accent: '#93c5fd', table: '#1e3a8a', kpi: '#1d4ed8', kpiAlt: '#2563eb' },
  traffic:   { header: '#0c2a45', accent: '#bae6fd', table: '#0c4a6e', kpi: '#0369a1', kpiAlt: '#0284c7' },
  security:  { header: '#1a0808', accent: '#fca5a5', table: '#7f1d1d', kpi: '#991b1b', kpiAlt: '#b91c1c' },
  alpr:      { header: '#1e1b4b', accent: '#c4b5fd', table: '#4c1d95', kpi: '#5b21b6', kpiAlt: '#6d28d9' },
  financial: { header: '#052e16', accent: '#86efac', table: '#14532d', kpi: '#15803d', kpiAlt: '#16a34a' },
  incidents: { header: '#1c0a00', accent: '#fde68a', table: '#78350f', kpi: '#92400e', kpiAlt: '#b45309' },
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
 *
 * Arabic lang → government/formal style:
 *   gold top stripe · centered system name · thin gold divider · centered title · gold bottom stripe
 * English lang → original coloured band style.
 */
function drawPageHeader(doc, state) {
  const L     = LABELS[state.lang];
  const isRtl = state.lang === 'ar';
  const theme = state.theme;

  if (isRtl) {
    // ── Arabic: government formal header ────────────────────────────────────

    // Gold top stripe (5 pt)
    doc.rect(0, 0, A4W, 5).fill(GOLD);

    // Dark header background band
    doc.rect(0, 5, A4W, HEADER_H - 10).fill(theme.header);

    // System name — centered, white, bold, 14 pt
    doc.fillColor('#ffffff').fontSize(14).font('bold');
    txt(doc, L.systemName, ML, 10, { width: CW, align: 'center', lineBreak: false }, state.lang);

    // Thin gold decorative divider line
    doc.moveTo(ML + 60, 30)
       .lineTo(A4W - MR - 60, 30)
       .lineWidth(0.7)
       .stroke(GOLD);

    // Report title — centered, gold, bold, 11 pt
    doc.fillColor('#f5d78e').fontSize(11).font('bold');
    txt(doc, state.title, ML, 33, { width: CW, align: 'center', lineBreak: false }, state.lang);

    // Generated-by + timestamp — centered, light gray, 7 pt
    const metaText = `${L.generatedBy}: ${state.user && state.user.fullName ? state.user.fullName : '—'}  ·  ${fmtDateTime(new Date())}`;
    doc.fillColor('#cccccc').fontSize(7).font('body');
    txt(doc, metaText, ML, 53, { width: CW, align: 'center', lineBreak: false }, state.lang);

    // Page number — left side (RTL convention), 7 pt
    const pageText = `${L.page} ${state.pageNum}`;
    doc.fillColor('#aaaaaa').fontSize(7).font('body');
    txt(doc, pageText, ML, 67, { width: CW, align: 'left', lineBreak: false }, state.lang);

    // Gold bottom stripe (5 pt)
    doc.rect(0, HEADER_H - 5, A4W, 5).fill(GOLD);

  } else {
    // ── English: original coloured band ─────────────────────────────────────

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
    const metaText = `${L.generatedBy}: ${state.user && state.user.fullName ? state.user.fullName : '—'}  ·  ${fmtDateTime(new Date())}`;
    doc.fillColor('#cccccc').fontSize(7).font('body');
    txt(doc, metaText, ML, 52, { width: CW, align: 'left', lineBreak: false }, state.lang);

    // Page number (top-right)
    const pageText = `${L.page} ${state.pageNum}`;
    doc.fillColor('#aaaaaa').fontSize(7).font('body');
    txt(doc, pageText, ML, 68, { width: CW, align: 'right', lineBreak: false }, state.lang);
  }

  // Reset cursor
  doc.fillColor(BRAND.text).font('body').fontSize(9);
}

// ── Page footer ────────────────────────────────────────────────────────────
/**
 * Arabic formal style: gold separator line (1.5 pt) + secondary thin line.
 * English style: original single thin line.
 */
function drawFooter(doc, state) {
  const L     = LABELS[state.lang];
  const isRtl = state.lang === 'ar';
  const lineY = A4H - FOOTER_H;

  if (isRtl) {
    // Gold separator (1.5 pt)
    doc.moveTo(ML, lineY).lineTo(A4W - MR, lineY)
      .lineWidth(1.5).stroke(GOLD);
    // Secondary thin line (0.3 pt), 3 pt below
    doc.moveTo(ML, lineY + 3).lineTo(A4W - MR, lineY + 3)
      .lineWidth(0.3).stroke(BRAND.line);

    doc.fillColor(BRAND.muted).fontSize(7).font('body');
    const footText = `${L.systemName}  ·  ${L.page} ${state.pageNum}  ·  ${L.confidential}`;
    txt(doc, footText, ML, lineY + 7, { width: CW, align: 'center', lineBreak: false }, state.lang);

    // Bottom thin border line
    doc.moveTo(ML, lineY + 21).lineTo(A4W - MR, lineY + 21)
      .lineWidth(0.3).stroke(BRAND.line);
  } else {
    doc.moveTo(ML, lineY).lineTo(A4W - MR, lineY)
      .lineWidth(0.5).stroke(BRAND.line);

    doc.fillColor(BRAND.muted).fontSize(7).font('body');
    const footText = `${L.systemName}  ·  ${L.page} ${state.pageNum}  ·  ${L.confidential}`;
    txt(doc, footText, ML, lineY + 6, { width: CW, align: 'center', lineBreak: false }, state.lang);
  }
}

// ── Section heading bar ────────────────────────────────────────────────────
/**
 * Draw a full-width colored heading bar.
 * Arabic formal style: adds a gold right-side accent strip (4 pt) + subtle outer border.
 * @returns {number} new y position (below the bar)
 */
function drawSection(doc, title, y, state) {
  const BAR_H   = 18;
  const isRtl   = state.lang === 'ar';
  const STRIP_W = 4; // gold accent strip width (Arabic only)

  // Main coloured bar
  doc.rect(ML, y, CW, BAR_H).fill(state.theme.table);

  if (isRtl) {
    // Gold accent strip on the right edge
    doc.rect(A4W - MR - STRIP_W, y, STRIP_W, BAR_H).fill(GOLD);
    // Subtle outer border for formality
    doc.rect(ML, y, CW, BAR_H).lineWidth(0.5).stroke('#00000022');
  }

  doc.fillColor('#ffffff').fontSize(9).font('bold');
  // Shrink text width slightly to avoid overlapping the gold strip
  const textW = isRtl ? CW - 12 - STRIP_W : CW - 12;
  txt(doc, title, ML + 6, y + 5, { width: textW, lineBreak: false }, state.lang);

  doc.fillColor(BRAND.text).font('body').fontSize(9);
  return y + BAR_H + 6;
}

// ── KPI cards row ──────────────────────────────────────────────────────────
/**
 * Draw a row of metric cards.
 * Arabic formal style: gold top stripe (3 pt) + subtle outer border on each card.
 * @param {Array<{label:string, value:string|number, color?:string}>} items
 * @returns {number} new y position
 */
function drawKpiCards(doc, items, y, state) {
  const GAP    = 5;
  const CARD_H = 54;
  const n      = items.length;
  const cardW  = (CW - GAP * (n - 1)) / n;
  const theme  = state.theme;
  const isRtl  = state.lang === 'ar';

  // RTL: reverse visual order so "first" KPI is on the right
  const vis = isRtl ? [...items].reverse() : items;

  vis.forEach((item, i) => {
    const cx = ML + i * (cardW + GAP);
    const accentColor = item.color || theme.kpi;

    if (isRtl) {
      // Arabic formal: solid colored card with gold top stripe
      doc.rect(cx, y, cardW, CARD_H).fill(accentColor);
      doc.rect(cx, y, cardW, 3).fill(GOLD);
      doc.rect(cx, y, cardW, CARD_H).lineWidth(0.5).stroke('#00000033');

      doc.fillColor('#ffffff').fontSize(18).font('bold');
      doc.text(String(item.value), cx + 4, y + 10,
        { width: cardW - 8, align: 'center', lineBreak: false });
      doc.fillColor('#ffffffcc').fontSize(7).font('body');
      txt(doc, item.label, cx + 4, y + 35,
        { width: cardW - 8, align: 'center', lineBreak: false }, state.lang);
    } else {
      // English: white card with colored left accent strip
      const STRIP = 4;
      doc.rect(cx, y, cardW, CARD_H).fill(BRAND.white);
      doc.rect(cx, y, cardW, CARD_H).lineWidth(0.5).stroke(BRAND.line);
      doc.rect(cx, y, STRIP, CARD_H).fill(accentColor);

      doc.fillColor(BRAND.text).fontSize(18).font('bold');
      doc.text(String(item.value), cx + STRIP + 4, y + 10,
        { width: cardW - STRIP - 8, align: 'center', lineBreak: false });
      doc.fillColor(BRAND.muted).fontSize(7).font('body');
      txt(doc, item.label, cx + STRIP + 4, y + 35,
        { width: cardW - STRIP - 8, align: 'center', lineBreak: false }, state.lang);
    }
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
 * Arabic formal style: full-grid vertical column dividers on every row.
 *
 * @param {string[]}   headers   - logical order (LTR: left to right / RTL: right to left)
 * @param {Array[]}    rows      - array of cell arrays, same logical order
 * @param {number[]}   colWidths - matching widths (must sum to <= CW)
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

  /** Draw vertical column divider lines across a single row (Arabic formal style). */
  function drawColDividers(ty, rowH, strokeColor) {
    let sx = ML;
    visCW.forEach((w) => {
      doc.moveTo(sx, ty).lineTo(sx, ty + rowH)
        .lineWidth(0.4).stroke(strokeColor);
      sx += w;
    });
    // Right outer border
    doc.moveTo(sx, ty).lineTo(sx, ty + rowH)
      .lineWidth(0.4).stroke(strokeColor);
  }

  function renderHeader(ty) {
    doc.rect(ML, ty, totalW, ROW_H).fill(theme.table);

    if (isRtl) {
      // Semi-transparent white dividers inside the header row
      drawColDividers(ty, ROW_H, '#ffffff55');
    }

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

    if (isRtl) {
      // Vertical column dividers for full-grid appearance (Arabic formal)
      drawColDividers(y, ROW_H, BRAND.line);
    }

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
  const start = dr && dr.startDate ? fmtDate(dr.startDate) : L.allTime;
  const end   = dr && dr.endDate   ? fmtDate(dr.endDate)   : L.allTime;
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
  BRAND, THEMES, LABELS, GOLD,
  // text utilities
  fixBidiForRtl, fmtDate, fmtDateTime, fmtMoney, clip, txt,
  // document setup
  setupFonts,
  // drawing primitives
  drawPageHeader, drawFooter, drawSection, drawKpiCards, drawTable,
  drawDateRange, checkPage,
};
