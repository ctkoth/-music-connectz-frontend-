// ReelZ, EpisodeZ and MovieZ are DirectZ's children BY LENGTH. A door into one
// leaves its key here before switching tab, so DirectZ opens with that band
// chosen. Its own module so ToolZ can call it without importing DirectZ.
export const PRESET_KEY = "mcz_directz_fmt";

export function presetDirectzFormat(fmt) {
  try { sessionStorage.setItem(PRESET_KEY, fmt); } catch { /* the door still opens DirectZ */ }
  window.dispatchEvent(new CustomEvent("mcz-directz-fmt", { detail: fmt }));
}

export function takeDirectzPreset() {
  try {
    const v = sessionStorage.getItem(PRESET_KEY);
    sessionStorage.removeItem(PRESET_KEY);
    return v;
  } catch {
    return null;
  }
}
