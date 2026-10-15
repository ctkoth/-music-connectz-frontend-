// The coach form's starting values, and where each one came from.
//
// Three sources, in order: the member's own choice on THIS device, then their
// history on the server (`defaults` from the coach GET), then the built-in
// choice. A device choice is only ever the member's own — it is written when
// they change a control, never when the screen starts. Storage is per device
// by design: it is a convenience, not state the server or Claude reads back.
//
// Pure on purpose: the storage object is passed in, so this runs under plain
// node with a fake store and the component passes window.localStorage.

export const BUILTIN_CHOICE = { genre: "R&B", range: "tenor", difficulty: "builder" };

export const DEFAULT_DIFFICULTIES = ["starter", "builder", "performer", "stageboss"];

// Shown beside the control. Nothing for the built-in choice: the screen should
// not announce that it is doing what it always did. Any source not listed here
// (the trial's unsaved changes, a genre a post handed over) shows nothing.
export const SOURCE_NOTE = {
  device: "Your last choice",
  server: "From your last take",
  builtin: "",
};

const key = (appKey) => `mcz_coach_prefs_${appKey}`;

// Reading `window.localStorage` itself can throw when site data is blocked, so
// the access is guarded too, not only the calls on it.
export function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Anything that is not a plain object is treated as nothing saved. Storage can
// throw (private mode, blocked site data) and can hold junk, so every read is
// guarded and a failure just means "no saved choice".
export function readPrefs(appKey, storage) {
  try {
    const raw = storage?.getItem(key(appKey));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// Merges one field into what is already saved. A failed write is silent: the
// choice still applies for this visit, it just is not remembered.
export function writePref(appKey, field, value, storage) {
  try {
    const next = { ...readPrefs(appKey, storage), [field]: value };
    storage?.setItem(key(appKey), JSON.stringify(next));
  } catch {
    /* storage unavailable: nothing to remember */
  }
}

// The value to show for one field, and where it came from. A stored or
// server value that is no longer in the option list (a genre renamed, a range
// removed) is skipped rather than handed to a <select> that cannot show it.
export function resolveChoice(field, { device, server, options }) {
  const ok = (v) => typeof v === "string" && v !== "" && options.includes(v);
  if (ok(device?.[field])) return { value: device[field], source: "device" };
  if (ok(server?.[field])) return { value: server[field], source: "server" };
  const built = BUILTIN_CHOICE[field];
  if (ok(built)) return { value: built, source: "builtin" };
  return { value: options[0] ?? "", source: "builtin" };
}
