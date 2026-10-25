// Game settings, persisted in localStorage so they survive reloads.
const SenesConfig = (function () {
  'use strict';

  const KEY = 'senesGame.config.v1';

  const SHAPES = Object.freeze(['circle', 'square', 'triangle', 'diamond', 'star', 'pyramid']);

  // Browsers assume 96 CSS pixels per inch, but tablets usually show nearer 132,
  // so start from a guess and let the screen calibration correct it.
  const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const ESTIMATED_PX_PER_CM = Math.round(((coarsePointer ? 132 : 96) / 2.54) * 2) / 2;

  const DEFAULTS = Object.freeze({
    speed: 40,       // idle circle speed in pixels per second
    maxCircles: 5,   // circles allowed on screen at once
    sizeCm: 8,       // circle diameter: about the length of a 10-month-old's hand
    pxPerCm: ESTIMATED_PX_PER_CM, // screen calibration
    shapes: SHAPES,  // shapes included in the game
    sound: true
  });

  const LIMITS = {
    speed: { min: 5, max: 200 },
    maxCircles: { min: 1, max: 20 },
    sizeCm: { min: 4, max: 16, step: 0.5 },
    pxPerCm: { min: 25, max: 75, step: 0.5 }
  };

  function clampNumber(value, limit, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const step = limit.step || 1;
    return Math.min(limit.max, Math.max(limit.min, Math.round(n / step) * step));
  }

  function sanitizeShapes(src) {
    let list = src.shapes;
    if (typeof list === 'string') list = list.split(',');
    // Older settings stored a single 'shape': 'mixed' or one shape name.
    if (!Array.isArray(list) && typeof src.shape === 'string') {
      list = src.shape === 'mixed' ? SHAPES : [src.shape];
    }
    const valid = Array.isArray(list) ? SHAPES.filter(s => list.indexOf(s) !== -1) : [];
    return valid.length ? valid : SHAPES.slice();
  }

  function sanitize(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      speed: clampNumber(src.speed, LIMITS.speed, DEFAULTS.speed),
      maxCircles: clampNumber(src.maxCircles, LIMITS.maxCircles, DEFAULTS.maxCircles),
      sizeCm: clampNumber(src.sizeCm, LIMITS.sizeCm, DEFAULTS.sizeCm),
      pxPerCm: clampNumber(src.pxPerCm, LIMITS.pxPerCm, DEFAULTS.pxPerCm),
      shapes: sanitizeShapes(src),
      sound: typeof src.sound === 'boolean' ? src.sound : DEFAULTS.sound
    };
  }

  // Settings also travel in the URL hash between the settings page and the game,
  // because some browsers keep separate storage for each file:// page.
  function toHash(cfg) {
    const clean = sanitize(cfg);
    return '#' + Object.keys(clean)
      .map(k => k + '=' + encodeURIComponent(clean[k]))
      .join('&');
  }

  function fromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;
    const values = {};
    for (const part of hash.split('&')) {
      const [k, v] = part.split('=');
      if (!k) continue;
      const value = decodeURIComponent(v || '');
      values[k] = value === 'true' ? true : value === 'false' ? false : value;
    }
    return values;
  }

  function load() {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      // Storage can be blocked (private mode, file:// in some browsers).
    }
    const fromUrl = fromHash();
    return fromUrl ? save(Object.assign({}, stored, fromUrl)) : sanitize(stored);
  }

  function save(cfg) {
    const clean = sanitize(cfg);
    try {
      localStorage.setItem(KEY, JSON.stringify(clean));
    } catch (e) {
      // Settings still apply for this session even if they can't be stored.
    }
    return clean;
  }

  return { DEFAULTS, LIMITS, SHAPES, load, save, toHash };
})();
