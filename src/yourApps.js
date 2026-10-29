// "Your apps": what a member actually uses, ranked so the home screen and the dock lead with it.
//
// Corey: most people will use a few apps, and the job is keeping THOSE easy to reach and the
// rest out of the way. So the ranking is the member's own, kept on their device (never sent):
// how often they open an app, decayed by how long ago they last did — an app they stopped
// using fades over a couple of weeks instead of holding its place forever. Pins always lead.
// Nothing here hides or removes an app; it only decides what is offered FIRST.
// Pure (no imports) so it runs under plain node.

export const USAGE_KEY = "mcz_app_usage";
export const LAST_KEY = "mcz_app_last";
export const PINS_KEY = "mcz_pinned_apps";
export const HALF_LIFE_DAYS = 14;
// Opened at least this many times before an app counts as "yours"; one visit is curiosity.
export const OWN_MIN_OPENS = 2;
// This many apps of their own before the home screen leads with them instead of the coach grid.
export const OWN_MIN_APPS = 3;
const DAY = 86400000;

/** Opens, weighted by how recent the last one was. An app with no timestamp (older data) is not decayed. */
export function frecency(key, usage = {}, last = {}, now = Date.now()) {
  const n = usage[key] || 0;
  if (!n) return 0;
  const t = last[key];
  const days = t ? Math.max(0, (now - t) / DAY) : 0;
  return n * Math.pow(0.5, days / HALF_LIFE_DAYS);
}

/** Pins first (in the member's order), then their own apps by frecency. */
export function rankApps({ usage = {}, last = {}, pins = [], now = Date.now(), exclude = [], limit = 8, valid = null } = {}) {
  const ok = (k) => !exclude.includes(k) && (!valid || valid.has(k));
  const out = [];
  for (const k of pins) if (ok(k) && !out.includes(k)) out.push(k);
  Object.keys(usage)
    .filter((k) => ok(k) && !out.includes(k) && (usage[k] || 0) >= OWN_MIN_OPENS)
    .sort((a, b) => frecency(b, usage, last, now) - frecency(a, usage, last, now))
    .forEach((k) => out.push(k));
  return out.slice(0, limit);
}

/** Does this member have enough of their own apps that the home screen should lead with them? */
export function hasOwnApps(opts) {
  return rankApps({ ...opts, limit: OWN_MIN_APPS }).length >= OWN_MIN_APPS;
}
