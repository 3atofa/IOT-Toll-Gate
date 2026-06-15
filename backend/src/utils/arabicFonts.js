/**
 * arabicFonts.js
 *
 * Downloads and caches Amiri (Arabic Naskh) and Cairo (Arabic sans-serif) TTF
 * fonts to src/assets/fonts/.
 *
 * Key design decisions:
 *   - Singleton promise per font: concurrent callers share the same download.
 *   - Graceful fallback: if any download fails we log a warning, callers fall
 *     back to Helvetica so English still renders correctly.
 *   - en-GB dates everywhere to avoid Eastern Arabic numeral artifacts.
 */

'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const FONTS_DIR = path.join(__dirname, '../assets/fonts');

// ── Font catalogue ─────────────────────────────────────────────────────────
// Multiple mirrors so one CDN outage doesn't break deploys.
const FONT_SOURCES = {
  'Amiri-Regular.ttf': [
    'https://raw.githubusercontent.com/aliftype/amiri/main/fonts/ttf/Amiri-Regular.ttf',
    'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf',
  ],
  'Amiri-Bold.ttf': [
    'https://raw.githubusercontent.com/aliftype/amiri/main/fonts/ttf/Amiri-Bold.ttf',
    'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Bold.ttf',
  ],
  'Cairo-Regular.ttf': [
    'https://github.com/google/fonts/raw/main/ofl/cairo/static/Cairo-Regular.ttf',
    'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/static/Cairo-Regular.ttf',
  ],
  'Cairo-Bold.ttf': [
    'https://github.com/google/fonts/raw/main/ofl/cairo/static/Cairo-Bold.ttf',
    'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/static/Cairo-Bold.ttf',
  ],
};

// ── Singleton promise map ──────────────────────────────────────────────────
/** @type {Map<string, Promise<string>>} */
const _promises = new Map();

/**
 * Download a single file from `url` to `dest`, following up to 5 redirects.
 * Returns a promise that resolves to `dest` on success.
 */
function _download(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft <= 0) {
      return reject(new Error(`Too many redirects for ${url}`));
    }

    const client = url.startsWith('https') ? https : http;

    client.get(url, { timeout: 30_000 }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        res.resume(); // drain the response
        return _download(res.headers.location, dest, redirectsLeft - 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);

      file.on('finish', () => file.close(() => resolve(dest)));
      file.on('error', (err) => {
        fs.unlink(dest, () => {}); // ignore cleanup error
        reject(err);
      });
    }).on('error', reject)
      .on('timeout', function () {
        this.destroy();
        reject(new Error(`Timeout fetching ${url}`));
      });
  });
}

/**
 * Download one font by trying each URL in order.
 * Returns a singleton promise — parallel callers share the same download.
 */
function downloadFont(filename) {
  // Already in flight / cached in-memory
  if (_promises.has(filename)) return _promises.get(filename);

  const dest = path.join(FONTS_DIR, filename);

  const p = (async () => {
    // Already on disk — skip download
    if (fs.existsSync(dest)) return dest;

    // Ensure directory
    fs.mkdirSync(FONTS_DIR, { recursive: true });

    const urls = FONT_SOURCES[filename];
    if (!urls) throw new Error(`Unknown font: ${filename}`);

    let lastErr;
    for (const url of urls) {
      try {
        await _download(url, dest);
        return dest;
      } catch (err) {
        lastErr = err;
        // Clean up partial file before trying next mirror
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        console.warn(`[arabicFonts] Mirror failed (${url}): ${err.message}`);
      }
    }
    throw lastErr;
  })();

  // Remove from map on failure so a retry is possible next request
  p.catch(() => _promises.delete(filename));
  _promises.set(filename, p);
  return p;
}

/**
 * Ensure all four fonts are cached on disk.
 * Call this before generating an Arabic PDF.
 * Does NOT throw — failures are logged, callers fall back to Helvetica.
 */
async function ensureArabicFonts() {
  const results = await Promise.allSettled(
    Object.keys(FONT_SOURCES).map((name) => downloadFont(name))
  );

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const name = Object.keys(FONT_SOURCES)[i];
      console.warn(`[arabicFonts] Could not download ${name}: ${r.reason?.message}`);
    }
  });
}

/**
 * Returns true if Amiri Regular + Bold are on disk (minimum for Arabic PDFs).
 */
function hasArabicFonts() {
  return ['Amiri-Regular.ttf', 'Amiri-Bold.ttf'].every(
    (f) => fs.existsSync(path.join(FONTS_DIR, f))
  );
}

/**
 * Returns the absolute path to a cached font file.
 * @param {'Amiri-Regular.ttf'|'Amiri-Bold.ttf'|'Cairo-Regular.ttf'|'Cairo-Bold.ttf'} name
 */
function fontPath(name) {
  return path.join(FONTS_DIR, name);
}

module.exports = { ensureArabicFonts, hasArabicFonts, fontPath, FONTS_DIR };
