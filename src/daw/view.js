// The Edit window's view settings, as pure decisions: how tall a track is, and what zoom means as a percentage.
// 100% is the zoom the DAW opened at before it learned to fit itself (40 px per second), so "200%" and "25%" mean the
// same thing on every screen, where px/s alone meant nothing to a member.
export const ZOOM_BASE = 40;
export const ZOOM_MIN = 0.1, ZOOM_MAX = 400;                 // px per second: ~2 hours across 800px, down to 12 px per beat-tick of detail
export const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
export const zoomPct = (z) => (z / ZOOM_BASE) * 100;
/** px/s for a typed percentage, or null when it is not a number (the caller then leaves the zoom alone). */
export const zoomFromPct = (pct) => (pct !== "" && pct !== null && Number.isFinite(Number(pct)) ? clampZoom((Number(pct) / 100) * ZOOM_BASE) : null);
export const PCT_MIN = zoomPct(ZOOM_MIN), PCT_MAX = zoomPct(ZOOM_MAX);
/** "132%", "8.5%", "0.25%": enough digits to tell neighbouring zooms apart, never a long tail. */
export const pctLabel = (z) => { const p = zoomPct(z); return `${p < 1 ? p.toFixed(2) : p < 10 ? p.toFixed(1) : Math.round(p)}%`; };

// Track heights. Compact keeps the name, record / solo / mute, volume, pan and FX; the rest add the take and tone rows and
// just give the waveform more room.
export const TRACK_SIZES = [
  { key: "compact", label: "Compact", h: 118, full: false },
  { key: "normal", label: "Normal", h: 126, full: true },
  { key: "large", label: "Large", h: 180, full: true },
  { key: "huge", label: "Huge", h: 260, full: true },
];
export const trackSize = (key) => TRACK_SIZES.find((s) => s.key === key) || TRACK_SIZES[1];
