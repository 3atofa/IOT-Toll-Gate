/**
 * arabicReport.service.js
 *
 * Generates professional bilingual (Arabic / English) PDF reports for all
 * six report types in the Intelligent Toll Gate System:
 *   summary | traffic | security | alpr | financial | incidents
 *
 * Arabic correctness checklist (from ARABIC_DOCUMENTS.md):
 *   ✓ OpenType features ['rtla','liga','dlig'] on every Arabic doc.text() call
 *   ✓ fixBidiForRtl() prepends RLM to Latin-first mixed strings
 *   ✓ fmtDate() always uses en-GB locale — no Eastern Arabic numerals
 *   ✓ RTL tables: column headers + cells physically reversed, x-positions mirrored
 *   ✓ setupFonts() called inside doc.on('pageAdded') so fonts survive page breaks
 *   ✓ Singleton font download via ensureArabicFonts() — no race conditions
 *   ✓ Graceful Helvetica fallback when fonts are unavailable
 */

'use strict';

const PDFDocument = require('pdfkit');
const { ensureArabicFonts } = require('../utils/arabicFonts');
const {
  CONTENT_TOP, CW, ML,
  THEMES, LABELS,
  setupFonts,
  drawPageHeader, drawFooter,
  drawSection, drawKpiCards, drawTable, drawDateRange,
  checkPage, fmtDate, fmtDateTime, fmtMoney, clip,
} = require('../utils/arabicPdf.utils');

// ── Create a fresh document state object ──────────────────────────────────
function makeState(lang, type, user) {
  const L = LABELS[lang] ?? LABELS.en;
  const titleMap = {
    summary:   L.summaryTitle,
    traffic:   L.trafficTitle,
    security:  L.securityTitle,
    alpr:      L.alprTitle,
    financial: L.financialTitle,
    incidents: L.incidentsTitle,
    full:      L.fullTitle,
  };
  return {
    lang,
    title: titleMap[type] ?? L.summaryTitle,
    theme: THEMES[type] ?? THEMES.summary,
    user,
    pageNum: 0, // incremented to 1 by first pageAdded event
  };
}

// ── Bootstrap a PDFKit document ───────────────────────────────────────────
function createDoc(state) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    autoFirstPage: false,
  });

  // Re-register fonts and bump page counter on every new page.
  // This handler fires synchronously inside doc.addPage() so fonts are always
  // set up before the caller's next drawing call.
  doc.on('pageAdded', () => {
    setupFonts(doc, state.lang);
    state.pageNum++;
  });

  return doc;
}

// ── Pipe doc to response ──────────────────────────────────────────────────
function pipeDoc(doc, res, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
}

// ── Open first page (or a section page for 'full' reports) ───────────────
function startPage(doc, state) {
  doc.addPage();               // triggers pageAdded → fonts set, pageNum incremented
  drawPageHeader(doc, state);
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION RENDERERS  (each returns the final y position)
// ══════════════════════════════════════════════════════════════════════════

// ── Summary ───────────────────────────────────────────────────────────────
function renderSummary(doc, data, y, state) {
  const L = LABELS[state.lang];
  const t = data.totals;

  y = checkPage(doc, y, 80, state);
  y = drawDateRange(doc, data.dateRange, y, state);
  y += 4;

  y = drawKpiCards(doc, [
    { label: L.totalCaptures, value: t.totalCaptures, color: state.theme.kpi },
    { label: L.accessGranted, value: t.accessGranted, color: '#059669'       },
    { label: L.accessDenied,  value: t.accessDenied,  color: '#dc2626'       },
    { label: L.securityAlerts,value: t.totalAlerts,   color: '#d97706'       },
  ], y, state);

  y = drawKpiCards(doc, [
    { label: L.secChecks,     value: t.securityChecks, color: '#7c3aed' },
    { label: L.regVehicles,   value: t.totalVehicles,  color: '#0891b2' },
    { label: L.authCards,     value: t.totalCards,     color: '#0d9488' },
  ], y, state);

  if (data.recentCaptures?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.recentCaptures, y, state);
    y = drawTable(doc,
      [L.capturedAt, L.gate, L.eventType, L.plate, L.face, L.decision],
      data.recentCaptures.slice(0, 10).map(c => [
        fmtDateTime(c.capturedAt), c.gateId, c.eventType,
        c.plateText || '—', c.faceName || '—', c.securityDecision || '—',
      ]),
      [130, 60, 95, 75, 70, 55],   // total = 485 ≤ CW
      y, state,
    );
  }

  if (data.recentAlerts?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.recentAlerts, y, state);
    y = drawTable(doc,
      [L.capturedAt, L.alertType, L.decision, L.reason],
      data.recentAlerts.slice(0, 10).map(a => [
        fmtDateTime(a.createdAt), a.alertType, a.decision || '—', a.reason || '—',
      ]),
      [125, 115, 75, 170],
      y, state,
    );
  }

  return y;
}

// ── Traffic ───────────────────────────────────────────────────────────────
function renderTraffic(doc, data, y, state) {
  const L = LABELS[state.lang];

  if (data.byGateEvent?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.gateBreakdown, y, state);
    y = drawTable(doc,
      [L.gate, L.eventType, L.count],
      data.byGateEvent.map(r => [r.gateId, r.eventType, r.count]),
      [160, 230, 95],
      y, state,
    );
  }

  if (data.topPlates?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.topPlates, y, state);
    y = drawTable(doc,
      [L.rank, L.plate, L.occurrences],
      data.topPlates.map((r, i) => [i + 1, r.plateText, r.count]),
      [55, 315, 115],
      y, state,
    );
  }

  if (data.byHour?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.hourlyDist, y, state);
    y = drawTable(doc,
      [L.hour, L.captures],
      data.byHour.map(r => [`${String(r.hour).padStart(2, '0')}:00`, r.count]),
      [245, 240],
      y, state,
    );
  }

  if (data.byDay?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.dailyTrend, y, state);
    y = drawTable(doc,
      [L.date, L.captures],
      data.byDay.map(r => [r.day, r.count]),
      [245, 240],
      y, state,
    );
  }

  return y;
}

// ── Security ──────────────────────────────────────────────────────────────
function renderSecurity(doc, data, y, state) {
  const L = LABELS[state.lang];
  const totalAlerts = data.byType?.reduce((s, r) => s + +r.count, 0) ?? 0;

  y = checkPage(doc, y, 80, state);
  y = drawKpiCards(doc, [
    { label: L.blocked,     value: data.blockedCount, color: '#dc2626' },
    { label: L.underReview, value: data.reviewCount,  color: '#d97706' },
    { label: L.totalAlerts, value: totalAlerts,        color: '#7c3aed' },
  ], y, state);

  if (data.byType?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.alertsByType, y, state);
    y = drawTable(doc,
      [L.alertType, L.count],
      data.byType.map(r => [r.alertType, r.count]),
      [370, 115],
      y, state,
    );
  }

  if (data.byDecision?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.alertsByDecision, y, state);
    y = drawTable(doc,
      [L.decision, L.count],
      data.byDecision.map(r => [r.decision || '—', r.count]),
      [370, 115],
      y, state,
    );
  }

  if (data.recentAlerts?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.alertDetails, y, state);
    y = drawTable(doc,
      [L.capturedAt, L.alertType, L.decision, L.reason],
      data.recentAlerts.map(a => [
        fmtDateTime(a.createdAt), a.alertType, a.decision || '—', a.reason || '—',
      ]),
      [125, 115, 75, 170],
      y, state,
    );
  }

  return y;
}

// ── ALPR ──────────────────────────────────────────────────────────────────
function renderAlpr(doc, data, y, state) {
  const L = LABELS[state.lang];
  const total    = (data.withPlate ?? 0) + (data.withoutPlate ?? 0);
  const faceTotal= (data.withFace  ?? 0) + (data.withoutFace  ?? 0);
  const plateRate= total     > 0 ? `${((data.withPlate  / total)     * 100).toFixed(1)}%` : 'N/A';
  const faceRate = faceTotal > 0 ? `${((data.withFace   / faceTotal) * 100).toFixed(1)}%` : 'N/A';
  const avgConf  = data.avgPlateConfidence
    ? `${(+data.avgPlateConfidence * 100).toFixed(1)}%` : 'N/A';

  y = checkPage(doc, y, 80, state);
  y = drawKpiCards(doc, [
    { label: L.platesDetected, value: data.withPlate ?? 0, color: '#059669' },
    { label: L.plateDetRate,   value: plateRate,            color: state.theme.kpi },
    { label: L.facesDetected,  value: data.withFace ?? 0,  color: '#7c3aed' },
    { label: L.avgConfidence,  value: avgConf,              color: '#0891b2' },
  ], y, state);

  if (data.byOcrStatus?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.ocrBreakdown, y, state);
    y = drawTable(doc,
      [L.ocrStatus, L.count],
      data.byOcrStatus.map(r => [r.ocrStatus, r.count]),
      [370, 115],
      y, state,
    );
  }

  y = checkPage(doc, y, 40, state);
  y = drawSection(doc, L.confBuckets, y, state);
  const cb = data.confidenceBuckets ?? {};
  y = drawTable(doc,
    [L.confidenceRange, L.count],
    [
      ['< 50%',      cb.low      ?? 0],
      ['50% – 70%',  cb.medium   ?? 0],
      ['70% – 85%',  cb.high     ?? 0],
      ['>= 85%',     cb.veryHigh ?? 0],
    ],
    [370, 115],
    y, state,
  );

  if (data.recentPlates?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.recentPlates, y, state);
    y = drawTable(doc,
      [L.capturedAt, L.gate, L.plate, L.confidence, L.ocrStatus],
      data.recentPlates.map(p => [
        fmtDateTime(p.capturedAt), p.gateId, p.plateText,
        p.plateConfidence != null ? `${(+p.plateConfidence * 100).toFixed(1)}%` : '—',
        p.ocrStatus,
      ]),
      [125, 60, 120, 80, 100],
      y, state,
    );
  }

  return y;
}

// ── Financial ─────────────────────────────────────────────────────────────
function renderFinancial(doc, fin, inc, y, state) {
  const L  = LABELS[state.lang];
  const dr = fin.dateRange;

  y = checkPage(doc, y, 20, state);
  y = drawDateRange(doc, dr, y, state);
  y += 2;

  // P&L KPI row
  y = drawKpiCards(doc, [
    { label: L.totalRevenue,   value: fmtMoney(fin.revenue?.total),           color: '#059669' },
    { label: L.repairExpenses, value: fmtMoney(fin.expenses?.repairTotal),     color: '#dc2626' },
    { label: L.staffCosts,     value: fmtMoney(fin.expenses?.staffPeriodCost), color: '#d97706' },
    { label: L.netPnL,
      value: fmtMoney(fin.netPnL),
      color: (+fin.netPnL >= 0) ? '#059669' : '#dc2626' },
  ], y, state);

  // Revenue by gate
  if (fin.revenue?.byGate?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.passRevenue, y, state);
    y = drawTable(doc,
      [L.gate, L.passes, L.feePerPass, L.revenue],
      fin.revenue.byGate.map(g => [
        g.gateId, g.count, fmtMoney(g.feePerPass), fmtMoney(g.revenue),
      ]),
      [155, 110, 110, 110],
      y, state,
    );
  }

  // Expense breakdown
  y = checkPage(doc, y, 40, state);
  y = drawSection(doc, L.expenseBreakdown, y, state);
  const months = dr?.months ?? 1;
  const nTechs = fin.expenses?.activeTechCount ?? 0;
  const nInc   = fin.expenses?.incidentCount   ?? 0;
  const nRes   = fin.expenses?.resolvedCount    ?? 0;
  y = drawTable(doc,
    [L.category, L.detail, L.amount],
    [
      [L.repairMaint,   `${nInc} ${L.incidents_} (${nRes} ${L.resolved_})`, fmtMoney(fin.expenses?.repairTotal)],
      [L.staffSalaries, `${nTechs} ${L.activeTechs} × ${months} ${L.months}`, fmtMoney(fin.expenses?.staffPeriodCost)],
      [L.totalExpenses, '',                                                   fmtMoney(fin.expenses?.total)],
    ],
    [150, 220, 115],
    y, state,
  );

  // Incidents overview (embedded in financial report)
  if (inc) {
    y = checkPage(doc, y, 80, state);
    y = drawSection(doc, L.incidentsOverview, y, state);
    y = drawKpiCards(doc, [
      { label: L.totalIncidents, value: inc.totals?.total,      color: '#d97706' },
      { label: L.open,           value: inc.totals?.open,        color: '#dc2626' },
      { label: L.inProgress,     value: inc.totals?.inProgress,  color: '#0891b2' },
      { label: L.resolved,       value: inc.totals?.resolved,    color: '#059669' },
    ], y, state);

    if (inc.bySeverity?.length) {
      y = checkPage(doc, y, 40, state);
      y = drawSection(doc, L.bySeverity, y, state);
      y = drawTable(doc,
        [L.severity, L.count],
        inc.bySeverity.map(r => [r.severity?.toUpperCase(), r.count]),
        [350, 135],
        y, state,
      );
    }

    if (inc.recentIncidents?.length) {
      y = checkPage(doc, y, 40, state);
      y = drawSection(doc, L.incidentLog, y, state);
      y = drawTable(doc,
        [L.reportedAt, L.gate, L.title, L.severity, L.status, L.repairCost],
        inc.recentIncidents.map(i => [
          fmtDate(i.reportedAt), i.gateId, i.title,
          i.severity, i.status, fmtMoney(i.repairCost),
        ]),
        [105, 55, 145, 55, 65, 60],
        y, state,
      );
    }
  }

  return y;
}

// ── Incidents-only ────────────────────────────────────────────────────────
function renderIncidents(doc, data, y, state) {
  const L = LABELS[state.lang];

  y = checkPage(doc, y, 20, state);
  y = drawDateRange(doc, data.dateRange, y, state);
  y += 4;

  y = drawKpiCards(doc, [
    { label: L.totalIncidents, value: data.totals?.total,     color: '#d97706' },
    { label: L.open,           value: data.totals?.open,       color: '#dc2626' },
    { label: L.inProgress,     value: data.totals?.inProgress, color: '#0891b2' },
    { label: L.resolved,       value: data.totals?.resolved,   color: '#059669' },
  ], y, state);

  if (data.bySeverity?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.bySeverity, y, state);
    y = drawTable(doc,
      [L.severity, L.count],
      data.bySeverity.map(r => [r.severity?.toUpperCase(), r.count]),
      [370, 115],
      y, state,
    );
  }

  if (data.byGate?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.gate, y, state);
    y = drawTable(doc,
      [L.gate, L.count],
      data.byGate.map(r => [r.gateId, r.count]),
      [370, 115],
      y, state,
    );
  }

  if (data.recentIncidents?.length) {
    y = checkPage(doc, y, 40, state);
    y = drawSection(doc, L.incidentLog, y, state);
    y = drawTable(doc,
      [L.reportedAt, L.gate, L.title, L.severity, L.status, L.repairCost],
      data.recentIncidents.map(i => [
        fmtDate(i.reportedAt), i.gateId, i.title,
        i.severity, i.status, fmtMoney(i.repairCost),
      ]),
      [105, 55, 145, 55, 65, 60],
      y, state,
    );
  }

  return y;
}

// ══════════════════════════════════════════════════════════════════════════
// PUBLIC EXPORT FUNCTIONS
// Each function:
//   1. Downloads Arabic fonts (no-op if already cached)
//   2. Creates the PDF document + state
//   3. Renders sections
//   4. Draws the final page footer
//   5. Flushes pages and ends the stream
// ══════════════════════════════════════════════════════════════════════════

async function exportPdf(req, res, next, type, dataMap) {
  try {
    const lang = req.query.lang === 'ar' ? 'ar' : 'en';

    if (lang === 'ar') {
      try { await ensureArabicFonts(); } catch (e) {
        console.warn('[arabicReport] Font download failed, falling back to Helvetica:', e.message);
      }
    }

    const state = makeState(lang, type, req.user);
    const doc   = createDoc(state);

    const fileName = `toll-gate-${type}-${new Date().toISOString().slice(0, 10)}-${lang}.pdf`;
    pipeDoc(doc, res, fileName);

    // First page
    startPage(doc, state);
    let y = CONTENT_TOP;

    if (type === 'summary')  { y = renderSummary(doc, dataMap.summary, y, state); }
    if (type === 'traffic')  { y = renderTraffic(doc, dataMap.traffic, y, state); }
    if (type === 'security') { y = renderSecurity(doc, dataMap.security, y, state); }
    if (type === 'alpr')     { y = renderAlpr(doc, dataMap.alpr, y, state); }

    if (type === 'full') {
      // Summary
      y = renderSummary(doc, dataMap.summary, y, state);

      // Traffic — new page
      drawFooter(doc, state);
      doc.addPage();
      state.title = LABELS[lang].trafficTitle;
      state.theme = THEMES.traffic;
      drawPageHeader(doc, state);
      y = CONTENT_TOP;
      y = renderTraffic(doc, dataMap.traffic, y, state);

      // Security — new page
      drawFooter(doc, state);
      doc.addPage();
      state.title = LABELS[lang].securityTitle;
      state.theme = THEMES.security;
      drawPageHeader(doc, state);
      y = CONTENT_TOP;
      y = renderSecurity(doc, dataMap.security, y, state);

      // ALPR — new page
      drawFooter(doc, state);
      doc.addPage();
      state.title = LABELS[lang].alprTitle;
      state.theme = THEMES.alpr;
      drawPageHeader(doc, state);
      y = CONTENT_TOP;
      y = renderAlpr(doc, dataMap.alpr, y, state);
    }

    drawFooter(doc, state);
    doc.flushPages();
    doc.end();
  } catch (err) {
    return next(err);
  }
}

async function exportFinancialPdf(req, res, next, financialData, incidentData) {
  try {
    const lang = req.query.lang === 'ar' ? 'ar' : 'en';

    if (lang === 'ar') {
      try { await ensureArabicFonts(); } catch (e) {
        console.warn('[arabicReport] Font download failed, falling back to Helvetica:', e.message);
      }
    }

    const state = makeState(lang, 'financial', req.user);
    const doc   = createDoc(state);

    const fileName = `toll-gate-financial-${new Date().toISOString().slice(0, 10)}-${lang}.pdf`;
    pipeDoc(doc, res, fileName);

    startPage(doc, state);
    let y = CONTENT_TOP;

    y = renderFinancial(doc, financialData, incidentData, y, state);

    drawFooter(doc, state);
    doc.flushPages();
    doc.end();
  } catch (err) {
    return next(err);
  }
}

async function exportIncidentsPdf(req, res, next, incidentData) {
  try {
    const lang = req.query.lang === 'ar' ? 'ar' : 'en';

    if (lang === 'ar') {
      try { await ensureArabicFonts(); } catch (e) {
        console.warn('[arabicReport] Font download failed, falling back to Helvetica:', e.message);
      }
    }

    const state = makeState(lang, 'incidents', req.user);
    const doc   = createDoc(state);

    const fileName = `toll-gate-incidents-${new Date().toISOString().slice(0, 10)}-${lang}.pdf`;
    pipeDoc(doc, res, fileName);

    startPage(doc, state);
    let y = CONTENT_TOP;

    y = renderIncidents(doc, incidentData, y, state);

    drawFooter(doc, state);
    doc.flushPages();
    doc.end();
  } catch (err) {
    return next(err);
  }
}

module.exports = { exportPdf, exportFinancialPdf, exportIncidentsPdf };
