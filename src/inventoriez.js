// InVenTorieZ's small pure decisions: how a piece's worth is WRITTEN. The server
// stores either an exact price (`price_cents`) or a 1-10 $ level (`price_level`,
// 1 the cheapest thing the member owns, 10 the dearest) and never both; this only
// words them, and never turns a level into dollars — it is the member's own
// scale, not a price.

export const LEVELS = 10;

export const dollars = (cents) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const signs = (level) => "$".repeat(Math.max(1, Math.min(LEVELS, Math.round(level) || 1)));

/** "$1,249.50", or "$$$ (3/10)", or "" when the member gave nothing. */
export function worthOf(it) {
  if (it?.price_cents > 0) return dollars(it.price_cents);
  if (it?.price_level >= 1) return `${signs(it.price_level)} (${it.price_level}/${LEVELS})`;
  return "";
}

/** Which way a piece's worth is being given: "exact", "level" or "none". */
export const modeOf = (it) => (it?.price_cents > 0 ? "exact" : it?.price_level >= 1 ? "level" : "none");

/** The piece with its worth switched to `mode`, the other half dropped so the two can never disagree. */
export function withMode(it, mode) {
  const { price_cents: _c, price_level: _l, price: _p, ...rest } = it || {};
  if (mode === "exact") return { ...rest, price: "" };
  if (mode === "level") return { ...rest, price_level: it?.price_level || 5 };
  return rest;
}

/** A typed price as cents, or null for anything that is not one. */
export function parsePrice(text) {
  const n = Number(String(text ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? Math.round(n * 100) : null;
}

/** The kit's worth in one line: dollars added up, $-levels counted beside them, never mixed. */
export function totalLine(v) {
  if (!v) return "";
  const parts = [];
  if (v.priced) parts.push(`${dollars(v.total_cents)} across ${v.priced} priced ${v.priced === 1 ? "piece" : "pieces"}`);
  if (v.levels) parts.push(`${v.levels} on your $ scale (average ${v.level_avg}/${LEVELS})`);
  if (!parts.length) return "";
  return parts.join(" · ") + (v.unvalued ? ` · ${v.unvalued} not valued` : "");
}
