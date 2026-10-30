// Where to land after signing in, for a link that sends a logged-out visitor through /login or
// /register (RequireAuth drops the address it came from). One slot, 30 minutes, path only — it is a
// convenience, so blocked storage just means landing on the home screen as before.
const KEY = "mcz_landing";
const MAX_AGE_MS = 30 * 60 * 1000;

export function setLanding(path) {
  try { localStorage.setItem(KEY, JSON.stringify({ path: String(path), at: Date.now() })); } catch { /* blocked */ }
}

export function peekLanding() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v || !String(v.path || "").startsWith("/") || Date.now() - v.at > MAX_AGE_MS) return "";
    return v.path;
  } catch { return ""; }
}

export function clearLanding() {
  try { localStorage.removeItem(KEY); } catch { /* blocked */ }
}
