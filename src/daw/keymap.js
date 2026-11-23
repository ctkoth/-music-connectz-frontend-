// Keyboard shortcuts for the DAW, and Azrael's skins — Reaper's "bend it to your workflow". Pure and
// tested. Every DAW uses the map (defaults unless changed); Azrael is the one that lets a member
// change it. Kept per DAW, on this device.

export const ACTIONS = [
  ["play", "Play / stop", "Space"],
  ["record", "Record", "R"],
  ["home", "Go to the start", "Enter"],
  ["undo", "Undo", "Ctrl+Z"],
  ["redo", "Redo", "Ctrl+Shift+Z"],
  ["split", "Split the region at the playhead", "B"],
  ["delete", "Delete the region", "Delete"],
  ["addtrack", "Add a track", "T"],
  ["bounce", "Bounce the mix", "Ctrl+Shift+B"],
  ["loop", "Loop on / off", "L"],
  ["loopsel", "Loop the selected region", "Shift+L"],
];
export const DEFAULTS = Object.fromEntries(ACTIONS.map(([id, , k]) => [id, k]));

// Skins, in ladder order (Free 3, Premium 6, StatZ all): a colour turn on the DAW, nothing else.
export const SKINS = [
  ["default", "Neon (default)", 0], ["crimson", "Crimson", 130], ["toxic", "Toxic", -120],
  ["ice", "Ice", 40], ["gold", "Gold", 170], ["violet", "Violet", 70], ["mono", "Mono", null], ["inferno", "Inferno", 150],
];

/** A key press as a name: "Ctrl+Shift+Z", "Space", "B", "Delete". Ctrl and Cmd are the same. */
export function keyName(e) {
  const k = e.code === "Space" ? "Space" : e.key === "Backspace" ? "Delete" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (["Control", "Shift", "Alt", "Meta"].includes(k)) return "";
  return [(e.ctrlKey || e.metaKey) && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", k].filter(Boolean).join("+");
}

/** The action a key press triggers, or null. */
export function actionFor(map, e) {
  const name = keyName(e);
  if (!name) return null;
  const hit = ACTIONS.find(([id]) => (map[id] || DEFAULTS[id]) === name);
  return hit ? hit[0] : null;
}

/** Assign `key` to `action`, taking it away from any action that had it — one key, one action. */
export function assign(map, action, key) {
  const next = { ...DEFAULTS, ...map };
  for (const id of Object.keys(next)) if (next[id] === key) next[id] = "";
  next[action] = key;
  return next;
}

const KEY = (app) => `mcz_daw_keys_${app}`;
const SKIN = (app) => `mcz_daw_skin_${app}`;
export function loadKeymap(app, store = globalThis.localStorage) {
  try { return { ...DEFAULTS, ...(JSON.parse(store?.getItem(KEY(app)) || "{}") || {}) }; } catch { return { ...DEFAULTS }; }
}
export function saveKeymap(app, map, store = globalThis.localStorage) { try { store?.setItem(KEY(app), JSON.stringify(map)); } catch { /* this tab only */ } }
export function loadSkin(app, store = globalThis.localStorage) { try { return store?.getItem(SKIN(app)) || "default"; } catch { return "default"; } }
export function saveSkin(app, s, store = globalThis.localStorage) { try { store?.setItem(SKIN(app), s); } catch { /* this tab only */ } }

/** The CSS filter a skin puts on the DAW. */
export function skinFilter(key) {
  const s = SKINS.find(([k]) => k === key);
  if (!s || s[2] === 0) return "";
  return s[2] === null ? "grayscale(1) contrast(1.1)" : `hue-rotate(${s[2]}deg)`;
}
