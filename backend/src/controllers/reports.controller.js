const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { GateCapture, SecurityAlert, Vehicle, AllowedCard, sequelize, Gate, Incident, Technician } = require('../models');
const arabicReport = require('../services/arabicReport.service');

const buildDateRange = (req) => {
  const start = req.query.startDate ? new Date(req.query.startDate) : null;
  const end = req.query.endDate ? new Date(req.query.endDate) : null;

  return {
    start: Number.isNaN(start?.getTime?.()) ? null : start,
    end: Number.isNaN(end?.getTime?.()) ? null : end,
  };
};

const fetchSummaryData = async (req) => {
  const { start, end } = buildDateRange(req);
  const captureWhere = {};
  if (start || end) {
    captureWhere.capturedAt = {};
    if (start) captureWhere.capturedAt[Op.gte] = start;
    if (end) captureWhere.capturedAt[Op.lte] = end;
  }

  const [totalCaptures, accessGranted, accessDenied, securityChecks, totalAlerts, totalVehicles, totalCards] = await Promise.all([
    GateCapture.count({ where: captureWhere }),
    GateCapture.count({ where: { ...captureWhere, eventType: 'access_granted' } }),
    GateCapture.count({ where: { ...captureWhere, eventType: 'access_denied' } }),
    GateCapture.count({ where: { ...captureWhere, eventType: 'security_check' } }),
    SecurityAlert.count({
      where: start || end
        ? {
            createdAt: {
              ...(start ? { [Op.gte]: start } : {}),
              ...(end ? { [Op.lte]: end } : {}),
            },
          }
        : {},
    }),
    Vehicle.count(),
    AllowedCard.count(),
  ]);

  const recentCaptures = await GateCapture.findAll({
    where: captureWhere,
    order: [['capturedAt', 'DESC']],
    limit: 10,
  });

  const recentAlerts = await SecurityAlert.findAll({
    where: start || end
      ? {
          createdAt: {
            ...(start ? { [Op.gte]: start } : {}),
            ...(end ? { [Op.lte]: end } : {}),
          },
        }
      : {},
    order: [['createdAt', 'DESC']],
    limit: 10,
  });

  return {
    dateRange: {
      startDate: start ? start.toISOString() : null,
      endDate: end ? end.toISOString() : null,
    },
    totals: {
      totalCaptures,
      accessGranted,
      accessDenied,
      securityChecks,
      totalAlerts,
      totalVehicles,
      totalCards,
    },
    recentCaptures,
    recentAlerts,
  };
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await fetchSummaryData(req);
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
};

// ─── Data fetchers (shared by GET handlers and PDF export) ────────

const fetchTrafficData = async (req) => {
  const { start, end } = buildDateRange(req);
  const w = {};
  if (req.query.gateId) w.gateId = req.query.gateId;
  if (start || end) {
    w.capturedAt = {};
    if (start) w.capturedAt[Op.gte] = start;
    if (end)   w.capturedAt[Op.lte] = end;
  }
  const [byGateEvent, byHour, byDay, topPlates] = await Promise.all([
    GateCapture.findAll({ where: w, attributes: ['gateId', 'eventType', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['gateId', 'eventType'], raw: true }),
    GateCapture.findAll({ where: w, attributes: [[sequelize.fn('EXTRACT', sequelize.literal('HOUR FROM "captured_at"')), 'hour'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: [sequelize.fn('EXTRACT', sequelize.literal('HOUR FROM "captured_at"'))], order: [[sequelize.fn('EXTRACT', sequelize.literal('HOUR FROM "captured_at"')), 'ASC']], raw: true }),
    GateCapture.findAll({ where: w, attributes: [[sequelize.fn('DATE', sequelize.col('captured_at')), 'day'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: [sequelize.fn('DATE', sequelize.col('captured_at'))], order: [[sequelize.fn('DATE', sequelize.col('captured_at')), 'ASC']], raw: true }),
    GateCapture.findAll({ where: { ...w, plateText: { [Op.ne]: null } }, attributes: ['plateText', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['plateText'], order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']], limit: 10, raw: true }),
  ]);
  return { byGateEvent, byHour, byDay, topPlates };
};

const fetchSecurityData = async (req) => {
  const { start, end } = buildDateRange(req);
  const aw = {};
  if (start || end) {
    aw.createdAt = {};
    if (start) aw.createdAt[Op.gte] = start;
    if (end)   aw.createdAt[Op.lte] = end;
  }
  const cw = {};
  if (start || end) {
    cw.capturedAt = {};
    if (start) cw.capturedAt[Op.gte] = start;
    if (end)   cw.capturedAt[Op.lte] = end;
  }
  const [byType, byDecision, recentAlerts, blockedCount, reviewCount] = await Promise.all([
    SecurityAlert.findAll({ where: aw, attributes: ['alertType', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['alertType'], raw: true }),
    SecurityAlert.findAll({ where: aw, attributes: ['decision', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['decision'], raw: true }),
    SecurityAlert.findAll({ where: aw, order: [['createdAt', 'DESC']], limit: 30 }),
    GateCapture.count({ where: { ...cw, securityDecision: 'block' } }),
    GateCapture.count({ where: { ...cw, securityDecision: 'review' } }),
  ]);
  return { byType, byDecision, recentAlerts, blockedCount, reviewCount };
};

const fetchAlprData = async (req) => {
  const { start, end } = buildDateRange(req);
  const w = {};
  if (start || end) {
    w.capturedAt = {};
    if (start) w.capturedAt[Op.gte] = start;
    if (end)   w.capturedAt[Op.lte] = end;
  }
  const [byOcrStatus, withPlate, withoutPlate, withFace, withoutFace, avgConfResult,
         lowConf, medConf, highConf, vHighConf, recentPlates] = await Promise.all([
    GateCapture.findAll({ where: w, attributes: ['ocrStatus', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['ocrStatus'], raw: true }),
    GateCapture.count({ where: { ...w, plateText: { [Op.ne]: null } } }),
    GateCapture.count({ where: { ...w, plateText: null } }),
    GateCapture.count({ where: { ...w, faceName: { [Op.ne]: null } } }),
    GateCapture.count({ where: { ...w, faceName: null } }),
    GateCapture.findOne({ where: { ...w, plateConfidence: { [Op.ne]: null } }, attributes: [[sequelize.fn('AVG', sequelize.col('plate_confidence')), 'avgConf']], raw: true }),
    GateCapture.count({ where: { ...w, plateConfidence: { [Op.lt]: 0.5 } } }),
    GateCapture.count({ where: { ...w, plateConfidence: { [Op.gte]: 0.5, [Op.lt]: 0.7 } } }),
    GateCapture.count({ where: { ...w, plateConfidence: { [Op.gte]: 0.7, [Op.lt]: 0.85 } } }),
    GateCapture.count({ where: { ...w, plateConfidence: { [Op.gte]: 0.85 } } }),
    GateCapture.findAll({ where: { ...w, plateText: { [Op.ne]: null } }, order: [['capturedAt', 'DESC']], limit: 20, attributes: ['id', 'gateId', 'plateText', 'plateConfidence', 'ocrStatus', 'capturedAt'] }),
  ]);
  return {
    byOcrStatus, withPlate, withoutPlate, withFace, withoutFace,
    avgPlateConfidence: avgConfResult?.avgConf ? parseFloat(avgConfResult.avgConf).toFixed(4) : null,
    confidenceBuckets: { low: lowConf, medium: medConf, high: highConf, veryHigh: vHighConf },
    recentPlates,
  };
};

// ─── PDF Export — supports ?type=summary|traffic|security|alpr|full&lang=ar|en ─
const exportPdf = async (req, res, next) => {
  try {
    const type = ['summary', 'traffic', 'security', 'alpr', 'full'].includes(req.query.type)
      ? req.query.type : 'summary';

    // ── Arabic / bilingual path ──────────────────────────────────
    if (req.query.lang === 'ar') {
      const [summaryData, trafficData, securityData, alprData] = await Promise.all([
        (type === 'summary'  || type === 'full') ? fetchSummaryData(req)  : Promise.resolve(null),
        (type === 'traffic'  || type === 'full') ? fetchTrafficData(req)  : Promise.resolve(null),
        (type === 'security' || type === 'full') ? fetchSecurityData(req) : Promise.resolve(null),
        (type === 'alpr'     || type === 'full') ? fetchAlprData(req)     : Promise.resolve(null),
      ]);
      return arabicReport.exportPdf(req, res, next, type, {
        summary: summaryData, traffic: trafficData,
        security: securityData, alpr: alprData,
      });
    }
    // ── English path (existing code below) ──────────────────────

    const [summaryData, trafficData, securityData, alprData] = await Promise.all([
      (type === 'summary'  || type === 'full') ? fetchSummaryData(req)  : Promise.resolve(null),
      (type === 'traffic'  || type === 'full') ? fetchTrafficData(req)  : Promise.resolve(null),
      (type === 'security' || type === 'full') ? fetchSecurityData(req) : Promise.resolve(null),
      (type === 'alpr'     || type === 'full') ? fetchAlprData(req)     : Promise.resolve(null),
    ]);

    const typeLabels = {
      summary:  'Summary Report',
      traffic:  'Traffic Analysis Report',
      security: 'Security Report',
      alpr:     'ALPR Performance Report',
      full:     'Full System Report',
    };

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const fileName = `toll-gate-${type}-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    // ── Design tokens ────────────────────────────────────────────
    const C = {
      headerBg: '#1e3a8a', primary: '#1d4ed8', green: '#059669', red: '#dc2626',
      amber: '#d97706', purple: '#7c3aed', cyan: '#0891b2', teal: '#0d9488',
      textDark: '#111827', textMuted: '#6b7280', rowAlt: '#f8fafc',
      border: '#e5e7eb', white: '#ffffff',
    };
    const PW     = doc.page.width;   // 595
    const ML     = 50;
    const BODY_W = PW - ML * 2;      // 495
    const SAFE_B = 60;

    const clip = (val, max) => {
      const s = String(val ?? '-');
      return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
    };

    // ── Page header ──────────────────────────────────────────────
    const drawPageHeader = (subtitle) => {
      doc.rect(0, 0, PW, 68).fill(C.headerBg);
      doc.fillColor(C.white).fontSize(15).font('Helvetica-Bold')
        .text('Intelligent Toll Gate System', ML, 14, { width: 310, lineBreak: false });
      doc.fillColor('#bfdbfe').fontSize(10).font('Helvetica')
        .text(subtitle, ML, 37, { width: 310, lineBreak: false });
      doc.fillColor('#93c5fd').fontSize(7.5)
        .text(
          `${new Date().toLocaleString()}  \u00b7  ${req.user.fullName} (${req.user.role})`,
          ML, 53, { width: BODY_W, align: 'right', lineBreak: false },
        );
      doc.y = 68 + 18;
      doc.fillColor(C.textDark).font('Helvetica').fontSize(9);
    };

    // ── Section title + rule ─────────────────────────────────────
    const drawSection = (title, color = C.primary) => {
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        drawPageHeader(typeLabels[type]);
      }
      doc.moveDown(0.4);
      doc.fillColor(color).fontSize(12).font('Helvetica-Bold').text(title);
      const ry = doc.y;
      doc.moveTo(ML, ry).lineTo(PW - ML, ry).lineWidth(1.5).stroke(color);
      doc.y = ry + 7;
      doc.fillColor(C.textDark).font('Helvetica').fontSize(9);
    };

    // ── KPI stat cards ───────────────────────────────────────────
    const drawKpiCards = (items) => {
      const gap   = 5;
      const cardW = (BODY_W - gap * (items.length - 1)) / items.length;
      const cardH = 52;
      const sy    = doc.y;
      items.forEach((item, i) => {
        const cx = ML + i * (cardW + gap);
        doc.rect(cx, sy, cardW, cardH).fill(item.color || C.primary);
        doc.fillColor(C.white).fontSize(17).font('Helvetica-Bold')
          .text(String(item.value), cx, sy + 8, { width: cardW, align: 'center', lineBreak: false });
        doc.fillColor(C.white).fontSize(7).font('Helvetica')
          .text(item.label, cx, sy + 33, { width: cardW, align: 'center', lineBreak: false });
      });
      doc.y = sy + cardH + 8;
      doc.fillColor(C.textDark).font('Helvetica').fontSize(9);
    };

    // ── Data table ───────────────────────────────────────────────
    const drawTable = (headers, rows, colWidths) => {
      const rowH   = 17;
      const totalW = colWidths.reduce((a, b) => a + b, 0);

      const renderHeader = (y) => {
        doc.rect(ML, y, totalW, rowH).fill(C.primary);
        let x = ML;
        headers.forEach((h, i) => {
          doc.fillColor(C.white).fontSize(7.5).font('Helvetica-Bold')
            .text(clip(h, 30), x + 3, y + 5, { width: colWidths[i] - 6, lineBreak: false });
          x += colWidths[i];
        });
        return y + rowH;
      };

      let y = doc.y;
      if (y + rowH * 3 > doc.page.height - SAFE_B) {
        doc.addPage(); drawPageHeader(typeLabels[type]); y = doc.y;
      }
      y = renderHeader(y);

      rows.forEach((row, ri) => {
        if (y + rowH > doc.page.height - SAFE_B) {
          doc.addPage(); drawPageHeader(typeLabels[type]); y = doc.y;
          y = renderHeader(y);
        }
        doc.rect(ML, y, totalW, rowH).fill(ri % 2 === 0 ? C.white : C.rowAlt);
        doc.rect(ML, y, totalW, rowH).stroke(C.border);
        let x = ML;
        row.forEach((cell, ci) => {
          doc.fillColor(C.textDark).fontSize(7.5).font('Helvetica')
            .text(clip(cell, 38), x + 3, y + 5, { width: colWidths[ci] - 6, lineBreak: false });
          x += colWidths[ci];
        });
        y += rowH;
      });
      doc.y = y + 6;
      doc.fillColor(C.textDark).font('Helvetica').fontSize(9);
    };

    // ── Date range blurb ─────────────────────────────────────────
    const drawDateRange = (dr) => {
      if (dr?.startDate || dr?.endDate) {
        doc.fontSize(8).fillColor(C.textMuted)
          .text(`Period: ${dr.startDate?.slice(0, 10) || 'All time'} \u2192 ${dr.endDate?.slice(0, 10) || 'All time'}`);
        doc.moveDown(0.3);
      }
    };

    // ══════════════════════════════════════════════════════════════
    // SECTION RENDERERS
    // ══════════════════════════════════════════════════════════════

    const renderSummary = (d) => {
      drawSection('System Summary', C.primary);
      drawDateRange(d.dateRange);
      const t = d.totals;
      drawKpiCards([
        { label: 'Total Captures',  value: t.totalCaptures, color: C.primary },
        { label: 'Access Granted',  value: t.accessGranted, color: C.green   },
        { label: 'Access Denied',   value: t.accessDenied,  color: C.red     },
        { label: 'Security Alerts', value: t.totalAlerts,   color: C.amber   },
      ]);
      drawKpiCards([
        { label: 'Security Checks', value: t.securityChecks, color: C.purple },
        { label: 'Reg. Vehicles',   value: t.totalVehicles,  color: C.cyan   },
        { label: 'Auth. Cards',     value: t.totalCards,     color: C.teal   },
      ]);
      if (d.recentCaptures.length > 0) {
        drawSection('Recent Captures (Last 10)');
        drawTable(
          ['Captured At', 'Gate', 'Event Type', 'Plate', 'Face', 'Decision'],
          d.recentCaptures.slice(0, 10).map(c => [
            new Date(c.capturedAt).toLocaleString(), c.gateId, c.eventType,
            c.plateText || '-', c.faceName || '-', c.securityDecision || '-',
          ]),
          [130, 65, 100, 75, 70, 55], // 495
        );
      }
      if (d.recentAlerts.length > 0) {
        drawSection('Recent Security Alerts (Last 10)', C.red);
        drawTable(
          ['Created At', 'Alert Type', 'Decision', 'Reason'],
          d.recentAlerts.slice(0, 10).map(a => [
            new Date(a.createdAt).toLocaleString(), a.alertType, a.decision || '-', a.reason || '-',
          ]),
          [130, 115, 75, 175], // 495
        );
      }
    };

    const renderTraffic = (d) => {
      drawSection('Traffic Analysis', C.cyan);
      if (d.byGateEvent.length > 0) {
        doc.fontSize(9).font('Helvetica-Bold').text('Gate & Event Breakdown').moveDown(0.2);
        drawTable(
          ['Gate ID', 'Event Type', 'Count'],
          d.byGateEvent.map(r => [r.gateId, r.eventType, r.count]),
          [165, 230, 100], // 495
        );
      }
      if (d.topPlates.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica-Bold').text('Top 10 Most Frequent Plates').moveDown(0.2);
        drawTable(
          ['Rank', 'Plate Number', 'Occurrences'],
          d.topPlates.map((r, i) => [i + 1, r.plateText, r.count]),
          [60, 310, 125], // 495
        );
      }
      if (d.byHour.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica-Bold').text('Hourly Distribution').moveDown(0.2);
        drawTable(
          ['Hour', 'Captures'],
          d.byHour.map(r => [`${String(r.hour).padStart(2, '0')}:00`, r.count]),
          [247, 248], // 495
        );
      }
      if (d.byDay.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica-Bold').text('Daily Trend').moveDown(0.2);
        drawTable(['Date', 'Captures'], d.byDay.map(r => [r.day, r.count]), [247, 248]);
      }
    };

    const renderSecurity = (d) => {
      drawSection('Security Overview', C.red);
      drawKpiCards([
        { label: 'Blocked Captures', value: d.blockedCount, color: C.red    },
        { label: 'Under Review',     value: d.reviewCount,  color: C.amber  },
        { label: 'Total Alerts',     value: d.byType.reduce((s, r) => s + +r.count, 0), color: C.purple },
      ]);
      if (d.byType.length > 0) {
        drawSection('Alerts by Type', C.red);
        drawTable(
          ['Alert Type', 'Count'],
          d.byType.map(r => [r.alertType, r.count]),
          [375, 120], // 495
        );
      }
      if (d.byDecision.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica-Bold').text('Alerts by Decision').moveDown(0.2);
        drawTable(
          ['Decision', 'Count'],
          d.byDecision.map(r => [r.decision || 'unresolved', r.count]),
          [375, 120],
        );
      }
      if (d.recentAlerts.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica-Bold').text('Alert Details (Last 30)').moveDown(0.2);
        drawTable(
          ['Created At', 'Alert Type', 'Decision', 'Reason'],
          d.recentAlerts.map(a => [
            new Date(a.createdAt).toLocaleString(), a.alertType, a.decision || '-', a.reason || '-',
          ]),
          [130, 115, 75, 175], // 495
        );
      }
    };

    const renderAlpr = (d) => {
      drawSection('ALPR Performance', C.purple);
      const total     = d.withPlate + d.withoutPlate;
      const plateRate = total     > 0 ? `${((d.withPlate / total) * 100).toFixed(1)}%`      : 'N/A';
      const faceTotal = d.withFace + d.withoutFace;
      const faceRate  = faceTotal > 0 ? `${((d.withFace / faceTotal) * 100).toFixed(1)}%`   : 'N/A';
      const avgConf   = d.avgPlateConfidence ? `${(+d.avgPlateConfidence * 100).toFixed(1)}%` : 'N/A';
      drawKpiCards([
        { label: 'Plates Detected',      value: d.withPlate, color: C.green   },
        { label: 'Plate Detection Rate', value: plateRate,   color: C.primary },
        { label: 'Faces Detected',       value: d.withFace,  color: C.purple  },
        { label: 'Avg Confidence',       value: avgConf,     color: C.cyan    },
      ]);
      if (d.byOcrStatus.length > 0) {
        drawSection('OCR Status Breakdown', C.purple);
        drawTable(
          ['OCR Status', 'Count'],
          d.byOcrStatus.map(r => [r.ocrStatus, r.count]),
          [375, 120],
        );
      }
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').text('Confidence Score Buckets').moveDown(0.2);
      drawTable(
        ['Confidence Range', 'Count'],
        [
          ['< 50%  (Low)',        d.confidenceBuckets.low],
          ['50-70% (Medium)',     d.confidenceBuckets.medium],
          ['70-85% (High)',       d.confidenceBuckets.high],
          ['>= 85% (Very High)',  d.confidenceBuckets.veryHigh],
        ],
        [375, 120],
      );
      if (d.recentPlates.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica-Bold').text('Recent Plates with OCR Data (Last 20)').moveDown(0.2);
        drawTable(
          ['Captured At', 'Gate', 'Plate', 'Confidence', 'OCR Status'],
          d.recentPlates.map(p => [
            new Date(p.capturedAt).toLocaleString(), p.gateId, p.plateText,
            p.plateConfidence != null ? `${(+p.plateConfidence * 100).toFixed(1)}%` : '-',
            p.ocrStatus,
          ]),
          [130, 65, 120, 80, 100], // 495
        );
      }
    };

    // ══════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════
    drawPageHeader(typeLabels[type]);

    if (type === 'summary')  { renderSummary(summaryData); }
    if (type === 'traffic')  { renderTraffic(trafficData); }
    if (type === 'security') { renderSecurity(securityData); }
    if (type === 'alpr')     { renderAlpr(alprData); }

    if (type === 'full') {
      renderSummary(summaryData);
      doc.addPage(); drawPageHeader('Traffic Analysis Report');  renderTraffic(trafficData);
      doc.addPage(); drawPageHeader('Security Report');          renderSecurity(securityData);
      doc.addPage(); drawPageHeader('ALPR Performance Report');  renderAlpr(alprData);
    }

    // Page numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor(C.textMuted).fontSize(7.5).font('Helvetica')
        .text(
          `Page ${i - range.start + 1} of ${range.count}  \u00b7  Intelligent Toll Gate System`,
          ML, doc.page.height - 28,
          { width: BODY_W, align: 'center', lineBreak: false },
        );
    }

    doc.flushPages();
    doc.end();
  } catch (error) {
    return next(error);
  }
};

// ─── Traffic Report ───────────────────────────────────────────────
const getTrafficReport = async (req, res, next) => {
  try {
    const { start, end } = buildDateRange(req);
    const captureWhere = {};
    if (req.query.gateId) captureWhere.gateId = req.query.gateId;
    if (start || end) {
      captureWhere.capturedAt = {};
      if (start) captureWhere.capturedAt[Op.gte] = start;
      if (end)   captureWhere.capturedAt[Op.lte] = end;
    }

    // Per-gate + per-event breakdown
    const byGateEvent = await GateCapture.findAll({
      where: captureWhere,
      attributes: [
        'gateId',
        'eventType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['gateId', 'eventType'],
      raw: true,
    });

    // Hourly distribution (hour 0–23)
    const byHour = await GateCapture.findAll({
      where: captureWhere,
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.literal('HOUR FROM "captured_at"')), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('EXTRACT', sequelize.literal('HOUR FROM "captured_at"'))],
      order:  [[sequelize.fn('EXTRACT', sequelize.literal('HOUR FROM "captured_at"')), 'ASC']],
      raw: true,
    });

    // Daily trend (grouped by date)
    const byDay = await GateCapture.findAll({
      where: captureWhere,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('captured_at')), 'day'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('captured_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('captured_at')), 'ASC']],
      raw: true,
    });

    // Top plates (most frequent)
    const topPlates = await GateCapture.findAll({
      where: { ...captureWhere, plateText: { [Op.ne]: null } },
      attributes: [
        'plateText',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['plateText'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true,
    });

    return res.json({ byGateEvent, byHour, byDay, topPlates });
  } catch (error) {
    return next(error);
  }
};

// ─── Security Report ──────────────────────────────────────────────
const getSecurityReport = async (req, res, next) => {
  try {
    const { start, end } = buildDateRange(req);
    const alertWhere = {};
    if (start || end) {
      alertWhere.createdAt = {};
      if (start) alertWhere.createdAt[Op.gte] = start;
      if (end)   alertWhere.createdAt[Op.lte] = end;
    }

    // Breakdown by alertType
    const byType = await SecurityAlert.findAll({
      where: alertWhere,
      attributes: [
        'alertType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['alertType'],
      raw: true,
    });

    // Breakdown by decision
    const byDecision = await SecurityAlert.findAll({
      where: alertWhere,
      attributes: [
        'decision',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['decision'],
      raw: true,
    });

    // Recent 30 alerts (full detail)
    const recentAlerts = await SecurityAlert.findAll({
      where: alertWhere,
      order: [['createdAt', 'DESC']],
      limit: 30,
    });

    // Blocked capture count
    const captureWhere = {};
    if (start || end) {
      captureWhere.capturedAt = {};
      if (start) captureWhere.capturedAt[Op.gte] = start;
      if (end)   captureWhere.capturedAt[Op.lte] = end;
    }
    const blockedCount = await GateCapture.count({
      where: { ...captureWhere, securityDecision: 'block' },
    });
    const reviewCount = await GateCapture.count({
      where: { ...captureWhere, securityDecision: 'review' },
    });

    return res.json({ byType, byDecision, recentAlerts, blockedCount, reviewCount });
  } catch (error) {
    return next(error);
  }
};

// ─── ALPR Performance Report ──────────────────────────────────────
const getAlprReport = async (req, res, next) => {
  try {
    const { start, end } = buildDateRange(req);
    const captureWhere = {};
    if (start || end) {
      captureWhere.capturedAt = {};
      if (start) captureWhere.capturedAt[Op.gte] = start;
      if (end)   captureWhere.capturedAt[Op.lte] = end;
    }

    // OCR status breakdown
    const byOcrStatus = await GateCapture.findAll({
      where: captureWhere,
      attributes: [
        'ocrStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['ocrStatus'],
      raw: true,
    });

    // Plate detected vs not
    const withPlate    = await GateCapture.count({ where: { ...captureWhere, plateText: { [Op.ne]: null } } });
    const withoutPlate = await GateCapture.count({ where: { ...captureWhere, plateText: null } });

    // Face detected vs not
    const withFace    = await GateCapture.count({ where: { ...captureWhere, faceName: { [Op.ne]: null } } });
    const withoutFace = await GateCapture.count({ where: { ...captureWhere, faceName: null } });

    // Average plate confidence (only where plateConfidence is not null)
    const avgConfResult = await GateCapture.findOne({
      where: { ...captureWhere, plateConfidence: { [Op.ne]: null } },
      attributes: [[sequelize.fn('AVG', sequelize.col('plate_confidence')), 'avgConf']],
      raw: true,
    });
    const avgPlateConfidence = avgConfResult?.avgConf ? parseFloat(avgConfResult.avgConf).toFixed(4) : null;

    // Confidence buckets: <0.5, 0.5–0.7, 0.7–0.85, >0.85
    const [lowConf, medConf, highConf, vHighConf] = await Promise.all([
      GateCapture.count({ where: { ...captureWhere, plateConfidence: { [Op.lt]: 0.5 } } }),
      GateCapture.count({ where: { ...captureWhere, plateConfidence: { [Op.gte]: 0.5, [Op.lt]: 0.7 } } }),
      GateCapture.count({ where: { ...captureWhere, plateConfidence: { [Op.gte]: 0.7, [Op.lt]: 0.85 } } }),
      GateCapture.count({ where: { ...captureWhere, plateConfidence: { [Op.gte]: 0.85 } } }),
    ]);

    // Recent 20 captures with plate data
    const recentPlates = await GateCapture.findAll({
      where: { ...captureWhere, plateText: { [Op.ne]: null } },
      order: [['capturedAt', 'DESC']],
      limit: 20,
      attributes: ['id', 'gateId', 'plateText', 'plateConfidence', 'ocrStatus', 'capturedAt'],
    });

    return res.json({
      byOcrStatus,
      withPlate,
      withoutPlate,
      withFace,
      withoutFace,
      avgPlateConfidence,
      confidenceBuckets: {
        low: lowConf,
        medium: medConf,
        high: highConf,
        veryHigh: vHighConf,
      },
      recentPlates,
    });
  } catch (error) {
    return next(error);
  }
};

// ─── CSV Export ───────────────────────────────────────────────────
const exportCsv = async (req, res, next) => {
  try {
    const { start, end } = buildDateRange(req);
    const type = req.query.type || 'captures'; // captures | alerts
    const captureWhere = {};
    if (req.query.gateId) captureWhere.gateId = req.query.gateId;
    if (start || end) {
      captureWhere.capturedAt = {};
      if (start) captureWhere.capturedAt[Op.gte] = start;
      if (end)   captureWhere.capturedAt[Op.lte] = end;
    }

    const fileName = `toll-gate-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    if (type === 'alerts') {
      const alertWhere = {};
      if (start || end) {
        alertWhere.createdAt = {};
        if (start) alertWhere.createdAt[Op.gte] = start;
        if (end)   alertWhere.createdAt[Op.lte] = end;
      }
      const alerts = await SecurityAlert.findAll({
        where: alertWhere,
        order: [['createdAt', 'DESC']],
        limit: 5000,
      });
      const header = 'ID,AlertType,Decision,Reason,RelatedName,RelatedPlate,ResolvedAt,CreatedAt\n';
      const rows = alerts.map(a =>
        [a.id, a.alertType, a.decision,
         `"${(a.reason || '').replace(/"/g, '""')}"`,
         a.relatedName || '', a.relatedPlate || '',
         a.resolvedAt ? new Date(a.resolvedAt).toISOString() : '',
         new Date(a.createdAt).toISOString(),
        ].join(',')
      ).join('\n');
      return res.send(header + rows);
    }

    // Default: captures
    const captures = await GateCapture.findAll({
      where: captureWhere,
      order: [['capturedAt', 'DESC']],
      limit: 5000,
    });
    const header = 'ID,GateID,EventType,CardUID,PlateText,PlateConfidence,FaceName,OCRStatus,SecurityDecision,SecurityReason,CapturedAt\n';
    const rows = captures.map(c =>
      [c.id, c.gateId, c.eventType, c.cardUid || '',
       c.plateText || '', c.plateConfidence != null ? c.plateConfidence : '',
       c.faceName || '', c.ocrStatus, c.securityDecision || '',
       `"${(c.securityReason || '').replace(/"/g, '""')}"`,
       new Date(c.capturedAt).toISOString(),
      ].join(',')
    ).join('\n');
    return res.send(header + rows);
  } catch (error) {
    return next(error);
  }
};

// ─── Financial Report ─────────────────────────────────────────────
const getFinancialReport = async (req, res, next) => {
  try {
    const { start, end } = buildDateRange(req);
    const captureWhere = { eventType: 'access_granted' };
    const incidentWhere = {};
    if (start || end) {
      captureWhere.capturedAt = {};
      incidentWhere.reportedAt = {};
      if (start) { captureWhere.capturedAt[Op.gte] = start; incidentWhere.reportedAt[Op.gte] = start; }
      if (end)   { captureWhere.capturedAt[Op.lte] = end;   incidentWhere.reportedAt[Op.lte] = end;   }
    }

    // Revenue: SUM(access_granted × gate.tollFeePerPass) per gate
    const gates = await Gate.findAll({ attributes: ['gateId', 'tollFeePerPass', 'location'] });
    const feeMap = {};
    gates.forEach(g => { feeMap[g.gateId] = parseFloat(g.tollFeePerPass) || 5.0; });

    const grantedByGate = await GateCapture.findAll({
      where: captureWhere,
      attributes: ['gateId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['gateId'],
      raw: true,
    });

    let totalRevenue = 0;
    const revenueByGate = grantedByGate.map(row => {
      const fee = feeMap[row.gateId] ?? 5.0;
      const revenue = parseInt(row.count) * fee;
      totalRevenue += revenue;
      return { gateId: row.gateId, count: parseInt(row.count), feePerPass: fee, revenue };
    });

    // Daily revenue trend
    const dailyRevenue = await GateCapture.findAll({
      where: captureWhere,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('captured_at')), 'day'],
        'gateId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('captured_at')), 'gateId'],
      order: [[sequelize.fn('DATE', sequelize.col('captured_at')), 'ASC']],
      raw: true,
    });

    // Expenses: sum incident repairCosts
    const incidentCostResult = await Incident.findOne({
      where: incidentWhere,
      attributes: [[sequelize.fn('SUM', sequelize.col('repairCost')), 'total']],
      raw: true,
    });
    const totalRepairCost = parseFloat(incidentCostResult?.total || 0);

    const incidentCount = await Incident.count({ where: incidentWhere });
    const resolvedCount = await Incident.count({ where: { ...incidentWhere, status: 'resolved' } });

    // Staff cost: sum active technician monthly salaries
    const staffResult = await Technician.findOne({
      where: { status: 'active' },
      attributes: [[sequelize.fn('SUM', sequelize.col('monthlySalary')), 'total']],
      raw: true,
    });
    const totalMonthlySalary = parseFloat(staffResult?.total || 0);
    const activeTechCount = await Technician.count({ where: { status: 'active' } });

    // Determine period months
    let months = 1;
    if (start && end) {
      const ms = new Date(end) - new Date(start);
      months = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24 * 30)));
    }
    const totalStaffCost = totalMonthlySalary * months;

    const netPnL = totalRevenue - totalRepairCost - totalStaffCost;

    return res.json({
      dateRange: {
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
        months,
      },
      revenue: {
        total: +totalRevenue.toFixed(2),
        byGate: revenueByGate,
        dailyTrend: dailyRevenue.map(r => ({
          day: r.day,
          gateId: r.gateId,
          count: parseInt(r.count),
          revenue: +(parseInt(r.count) * (feeMap[r.gateId] ?? 5.0)).toFixed(2),
        })),
      },
      expenses: {
        repairTotal: +totalRepairCost.toFixed(2),
        incidentCount,
        resolvedCount,
        staffMonthlyCost: +totalMonthlySalary.toFixed(2),
        staffPeriodCost: +totalStaffCost.toFixed(2),
        activeTechCount,
        total: +(totalRepairCost + totalStaffCost).toFixed(2),
      },
      netPnL: +netPnL.toFixed(2),
    });
  } catch (err) { return next(err); }
};

// ─── Incidents Summary Report ─────────────────────────────────────
const getIncidentsReport = async (req, res, next) => {
  try {
    const { start, end } = buildDateRange(req);
    const where = {};
    if (start || end) {
      where.reportedAt = {};
      if (start) where.reportedAt[Op.gte] = start;
      if (end)   where.reportedAt[Op.lte] = end;
    }

    const [
      total, openCount, inProgressCount, resolvedCount,
      bySeverity, byGate, recentIncidents,
      totalRepairCost, avgResolutionMs,
    ] = await Promise.all([
      Incident.count({ where }),
      Incident.count({ where: { ...where, status: 'open' } }),
      Incident.count({ where: { ...where, status: 'in_progress' } }),
      Incident.count({ where: { ...where, status: 'resolved' } }),
      Incident.findAll({
        where,
        attributes: ['severity', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['severity'],
        raw: true,
      }),
      Incident.findAll({
        where,
        attributes: ['gateId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['gateId'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        raw: true,
      }),
      Incident.findAll({
        where,
        include: [{ model: Technician, as: 'assignedTechnician', attributes: ['id', 'fullName', 'specialization'] }],
        order: [['reportedAt', 'DESC']],
        limit: 50,
      }),
      Incident.findOne({
        where,
        attributes: [[sequelize.fn('SUM', sequelize.col('repairCost')), 'total']],
        raw: true,
      }),
      Incident.findOne({
        where: { ...where, resolvedAt: { [Op.ne]: null } },
        attributes: [[sequelize.fn('AVG',
          sequelize.fn('EXTRACT', sequelize.literal('EPOCH FROM ("resolvedAt" - "reportedAt")'))),
          'avgSeconds']],
        raw: true,
      }),
    ]);

    const avgResolutionHours = avgResolutionMs?.avgSeconds
      ? +(parseFloat(avgResolutionMs.avgSeconds) / 3600).toFixed(1)
      : null;

    return res.json({
      dateRange: { startDate: start?.toISOString() || null, endDate: end?.toISOString() || null },
      totals: { total, open: openCount, inProgress: inProgressCount, resolved: resolvedCount },
      totalRepairCost: +(parseFloat(totalRepairCost?.total || 0)).toFixed(2),
      avgResolutionHours,
      bySeverity,
      byGate,
      recentIncidents,
    });
  } catch (err) { return next(err); }
};

// ─── Financial PDF Export ─────────────────────────────────────────
const exportFinancialPdf = async (req, res, next) => {
  try {
    // ── Arabic / bilingual path ──────────────────────────────────
    if (req.query.lang === 'ar') {
      const fakeReq = { query: req.query, user: req.user };
      let financialData, incidentData;
      await new Promise((resolve, reject) => {
        const fakeRes = { json: (d) => { financialData = d; resolve(); }, status: () => fakeRes };
        getFinancialReport(fakeReq, fakeRes, reject);
      });
      await new Promise((resolve, reject) => {
        const fakeRes = { json: (d) => { incidentData = d; resolve(); }, status: () => fakeRes };
        getIncidentsReport(fakeReq, fakeRes, reject);
      });
      return arabicReport.exportFinancialPdf(req, res, next, financialData, incidentData);
    }
    // ── English path (existing code below) ──────────────────────

    // Reuse financial data
    const fakeReq = { query: req.query, user: req.user };
    let financialData;
    await new Promise((resolve, reject) => {
      const fakeRes = {
        json: (d) => { financialData = d; resolve(); },
        status: () => fakeRes,
      };
      getFinancialReport(fakeReq, fakeRes, reject);
    });

    let incidentData;
    await new Promise((resolve, reject) => {
      const fakeRes = {
        json: (d) => { incidentData = d; resolve(); },
        status: () => fakeRes,
      };
      getIncidentsReport(fakeReq, fakeRes, reject);
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const fileName = `toll-gate-financial-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    const C = {
      headerBg: '#14532d', primary: '#16a34a', green: '#059669', red: '#dc2626',
      amber: '#d97706', purple: '#7c3aed', cyan: '#0891b2',
      textDark: '#111827', textMuted: '#6b7280', rowAlt: '#f0fdf4',
      border: '#d1fae5', white: '#ffffff',
    };
    const PW = doc.page.width, ML = 50, BODY_W = PW - ML * 2, SAFE_B = 60;

    const clip = (val, max) => {
      const s = String(val ?? '-');
      return s.length > max ? s.slice(0, max - 1) + '…' : s;
    };

    const drawPageHeader = (subtitle) => {
      doc.rect(0, 0, PW, 68).fill(C.headerBg);
      doc.fillColor(C.white).fontSize(15).font('Helvetica-Bold')
        .text('Intelligent Toll Gate System', ML, 14, { width: 310, lineBreak: false });
      doc.fillColor('#bbf7d0').fontSize(10).font('Helvetica')
        .text(subtitle, ML, 37, { width: 310, lineBreak: false });
      doc.fillColor('#86efac').fontSize(7.5)
        .text(`${new Date().toLocaleString()}  ·  ${req.user.fullName} (${req.user.role})`,
          ML, 53, { width: BODY_W, align: 'right', lineBreak: false });
      doc.y = 68 + 18;
      doc.fillColor(C.textDark).font('Helvetica').fontSize(9);
    };

    const drawSection = (title, color = C.primary) => {
      if (doc.y > doc.page.height - 120) { doc.addPage(); drawPageHeader('Financial Report'); }
      doc.moveDown(0.4);
      doc.fillColor(color).fontSize(12).font('Helvetica-Bold').text(title);
      const ry = doc.y;
      doc.moveTo(ML, ry).lineTo(PW - ML, ry).lineWidth(1.5).stroke(color);
      doc.y = ry + 7;
      doc.fillColor(C.textDark).font('Helvetica').fontSize(9);
    };

    const drawKpiCards = (items) => {
      const gap = 5, cardW = (BODY_W - gap * (items.length - 1)) / items.length, cardH = 52;
      const sy = doc.y;
      items.forEach((item, i) => {
        const cx = ML + i * (cardW + gap);
        doc.rect(cx, sy, cardW, cardH).fill(item.color || C.primary);
        doc.fillColor(C.white).fontSize(17).font('Helvetica-Bold')
          .text(String(item.value), cx, sy + 8, { width: cardW, align: 'center', lineBreak: false });
        doc.fillColor(C.white).fontSize(7).font('Helvetica')
          .text(item.label, cx, sy + 33, { width: cardW, align: 'center', lineBreak: false });
      });
      doc.y = sy + cardH + 8;
      doc.fillColor(C.textDark).font('Helvetica').fontSize(9);
    };

    const drawTable = (headers, rows, colWidths) => {
      const rowH = 17, totalW = colWidths.reduce((a, b) => a + b, 0);
      const renderHeader = (y) => {
        doc.rect(ML, y, totalW, rowH).fill(C.primary);
        let x = ML;
        headers.forEach((h, i) => {
          doc.fillColor(C.white).fontSize(7.5).font('Helvetica-Bold')
            .text(clip(h, 30), x + 3, y + 5, { width: colWidths[i] - 6, lineBreak: false });
          x += colWidths[i];
        });
        return y + rowH;
      };
      let y = doc.y;
      if (y + rowH * 3 > doc.page.height - SAFE_B) { doc.addPage(); drawPageHeader('Financial Report'); y = doc.y; }
      y = renderHeader(y);
      rows.forEach((row, ri) => {
        if (y + rowH > doc.page.height - SAFE_B) { doc.addPage(); drawPageHeader('Financial Report'); y = doc.y; y = renderHeader(y); }
        doc.rect(ML, y, totalW, rowH).fill(ri % 2 === 0 ? C.white : C.rowAlt);
        doc.rect(ML, y, totalW, rowH).stroke(C.border);
        let x = ML;
        row.forEach((cell, ci) => {
          doc.fillColor(C.textDark).fontSize(7.5).font('Helvetica')
            .text(clip(cell, 38), x + 3, y + 5, { width: colWidths[ci] - 6, lineBreak: false });
          x += colWidths[ci];
        });
        y += rowH;
      });
      doc.y = y + 6;
      doc.fillColor(C.textDark).font('Helvetica').fontSize(9);
    };

    const fmt = (n) => `EGP ${(+n || 0).toFixed(2)}`;

    // ── RENDER ────────────────────────────────────────────────────
    drawPageHeader('Financial & Operations Report');

    // P&L Summary KPIs
    drawSection('Profit & Loss Summary', C.primary);
    const dr = financialData.dateRange;
    doc.fontSize(8).fillColor(C.textMuted)
      .text(`Period: ${dr.startDate?.slice(0,10) || 'All time'} → ${dr.endDate?.slice(0,10) || 'All time'}  (${dr.months} month${dr.months !== 1 ? 's' : ''})`)
      .moveDown(0.3);
    drawKpiCards([
      { label: 'Total Revenue',    value: fmt(financialData.revenue.total),          color: C.green    },
      { label: 'Repair Expenses',  value: fmt(financialData.expenses.repairTotal),    color: C.red      },
      { label: 'Staff Costs',      value: fmt(financialData.expenses.staffPeriodCost), color: C.amber   },
      { label: 'Net P&L',          value: fmt(financialData.netPnL),                 color: financialData.netPnL >= 0 ? C.green : C.red },
    ]);

    // Revenue by gate
    drawSection('Gate Pass Revenue', C.cyan);
    drawTable(
      ['Gate ID', 'Passes', 'Fee / Pass', 'Revenue'],
      financialData.revenue.byGate.map(g => [g.gateId, g.count, fmt(g.feePerPass), fmt(g.revenue)]),
      [155, 110, 110, 120],
    );

    // Expenses breakdown
    drawSection('Expense Breakdown', C.red);
    drawTable(
      ['Category', 'Detail', 'Amount'],
      [
        ['Repair / Maintenance', `${financialData.expenses.incidentCount} incidents (${financialData.expenses.resolvedCount} resolved)`, fmt(financialData.expenses.repairTotal)],
        ['Staff Salaries', `${financialData.expenses.activeTechCount} active technicians × ${dr.months} month(s)`, fmt(financialData.expenses.staffPeriodCost)],
        ['Total Expenses', '', fmt(financialData.expenses.total)],
      ],
      [155, 220, 120],
    );

    // Incidents breakdown
    drawSection('Incidents Overview', C.amber);
    drawKpiCards([
      { label: 'Total Incidents', value: incidentData.totals.total,      color: C.amber    },
      { label: 'Open',            value: incidentData.totals.open,        color: C.red      },
      { label: 'In Progress',     value: incidentData.totals.inProgress,  color: C.cyan     },
      { label: 'Resolved',        value: incidentData.totals.resolved,    color: C.green    },
    ]);
    if (incidentData.bySeverity.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold').text('By Severity').moveDown(0.2);
      drawTable(
        ['Severity', 'Count'],
        incidentData.bySeverity.map(r => [r.severity.toUpperCase(), r.count]),
        [350, 145],
      );
    }
    if (incidentData.recentIncidents.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').text('Incident Log (Last 50)').moveDown(0.2);
      drawTable(
        ['Reported At', 'Gate', 'Title', 'Severity', 'Status', 'Repair Cost'],
        incidentData.recentIncidents.map(i => [
          new Date(i.reportedAt).toLocaleString(), i.gateId, i.title,
          i.severity, i.status, fmt(i.repairCost),
        ]),
        [110, 60, 140, 55, 65, 65],
      );
    }

    // Page numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor(C.textMuted).fontSize(7.5).font('Helvetica')
        .text(`Page ${i - range.start + 1} of ${range.count}  ·  Intelligent Toll Gate System — Financial Report`,
          ML, doc.page.height - 28, { width: BODY_W, align: 'center', lineBreak: false });
    }
    doc.flushPages();
    doc.end();
  } catch (err) { return next(err); }
};

// ─── Incidents PDF Export ─────────────────────────────────────────
const exportIncidentsPdf = async (req, res, next) => {
  try {
    const fakeReq = { query: req.query, user: req.user };
    let incidentData;
    await new Promise((resolve, reject) => {
      const fakeRes = { json: (d) => { incidentData = d; resolve(); }, status: () => fakeRes };
      getIncidentsReport(fakeReq, fakeRes, reject);
    });
    return arabicReport.exportIncidentsPdf(req, res, next, incidentData);
  } catch (err) { return next(err); }
};

module.exports = {
  getSummary,
  exportPdf,
  getTrafficReport,
  getSecurityReport,
  getAlprReport,
  exportCsv,
  getFinancialReport,
  getIncidentsReport,
  exportFinancialPdf,
  exportIncidentsPdf,
};
