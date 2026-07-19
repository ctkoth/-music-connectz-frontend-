// ============================================================================
// Music ConnectZ — CANONICAL economy config. Single source of truth for tiers,
// taxes, limits, membership pricing, trials, and the rating-price formula.
// If a rule about money, caps, or tiers lives anywhere, it lives HERE.
// Keep apps/economy/catalog.py + models.py (backend) in sync with these values.
// ============================================================================

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Semantic colors for numbers: GREEN = money in / growth, RED = money out / cost.
// Callers use `flowColor("in")` etc. or the <Amount> component in Mcz2App.
export const FLOW_GREEN = "var(--success, #35d07f)";
export const FLOW_RED = "var(--danger, #ff5a5f)";
export function flowColor(direction) {
  if (direction === "in" || direction === "gain" || direction === "up") return FLOW_GREEN;
  if (direction === "out" || direction === "cost" || direction === "down") return FLOW_RED;
  return "inherit";
}

// SpinAZ — the in-app currency. $1 = 100 SpinAZ.
export const SPINAZ_PER_DOLLAR = 100;
export const dollarsToSpinaz = (usd) => Math.round((Number(usd) || 0) * SPINAZ_PER_DOLLAR);
export const spinazToDollars = (sp) => (Number(sp) || 0) / SPINAZ_PER_DOLLAR;

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------
export const TIERS = ["free", "premium", "statz"];

export function tierKey(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return "statz";
  if (t.includes("premium") || t.includes("pro")) return "premium";
  if (t.includes("debug")) return "debug"; // owner-only
  return "free";
}
export function tierLabel(tier) {
  return { free: "Free", premium: "Premium", statz: "StatZ", debug: "Debug" }[tierKey(tier)];
}
export const TIER_EMOJI = { free: "🤗", premium: "🥇", statz: "📈", debug: "🛠️" };

// ---------------------------------------------------------------------------
// Developer tax — platform cut on every transaction (skill sales, media, etc).
// Free 10% · Premium 5% · StatZ 3% · Debug/owner 0%.
// ---------------------------------------------------------------------------
export const DEV_TAX = { free: 0.10, premium: 0.05, statz: 0.03, debug: 0.0 };

export function devTaxFor(tier) {
  const k = tierKey(tier);
  return { label: tierLabel(k), key: k, rate: DEV_TAX[k] ?? 0.10 };
}

// Split a transaction into the developer's cut and the remainder.
export function splitTransaction(amount, tier) {
  const { label, rate } = devTaxFor(tier);
  const gross = Number(amount) || 0;
  const dev = Math.round(gross * rate * 100) / 100;
  const net = Math.round((gross - dev) * 100) / 100;
  return { gross, dev, net, rate, label };
}

// ---------------------------------------------------------------------------
// RoyaltieZ 👑 — cashout tax, cheaper the longer you let funds mature.
// Instant 15% (flat). Weekly by tier (Free10/Prem5/StatZ3). Monthly 1%. 3-month 0%.
// ---------------------------------------------------------------------------
export const ROYALTIEZ = {
  instant: { id: "instant", label: "Instant", emoji: "⚡", note: "Cash out now", flat: 0.15 },
  weekly: { id: "weekly", label: "Weekly", emoji: "🗓️", note: "Hold ~7 days", byTier: { free: 0.10, premium: 0.05, statz: 0.03, debug: 0 } },
  monthly: { id: "monthly", label: "Monthly", emoji: "📆", note: "Hold ~30 days", flat: 0.01 },
  quarterly: { id: "quarterly", label: "3-Month", emoji: "🏆", note: "Hold ~90 days — tax free", flat: 0.0 },
};

export function cashoutTaxRate(scheduleId, tier) {
  const s = ROYALTIEZ[scheduleId] || ROYALTIEZ.instant;
  return s.byTier ? (s.byTier[tierKey(tier)] ?? 0.10) : s.flat;
}
export function splitCashout(amount, scheduleId, tier) {
  const rate = cashoutTaxRate(scheduleId, tier);
  const gross = Number(amount) || 0;
  const tax = Math.round(gross * rate * 100) / 100;
  return { gross, tax, net: Math.round((gross - tax) * 100) / 100, rate };
}

// ---------------------------------------------------------------------------
// Per-tier caps. char_limit = text (messages/posts/comments/AI prompts).
// upload_mb = per-file. storage_mb = total account storage.
// ---------------------------------------------------------------------------
export const TIER_LIMITS = {
  free: { char_limit: 400, upload_mb: 40, storage_mb: 400 },
  premium: { char_limit: 4000, upload_mb: 400, storage_mb: 5120 },     // 5GB
  statz: { char_limit: 40000, upload_mb: 4096, storage_mb: 102400 },   // 4GB / 100GB
};

export function limitsFor(tier) {
  const k = tierKey(tier);
  const base = TIER_LIMITS[k] || TIER_LIMITS.free;
  return { ...base, tier: k === "debug" ? "statz" : k };
}

// Warn when within 10% of a cap; lock at/over it.
export const LIMIT_WARN_RATIO = 0.9;
export function limitState(used, cap) {
  const c = Number(cap) || 0;
  if (!c) return { ok: true, warn: false, locked: false, ratio: 0 };
  const ratio = (Number(used) || 0) / c;
  return { ok: ratio < 1, warn: ratio >= LIMIT_WARN_RATIO && ratio < 1, locked: ratio >= 1, ratio };
}

// Human-friendly storage/upload label: 400 -> "400MB", 5120 -> "5GB".
export function mbLabel(mb) {
  const n = Number(mb) || 0;
  return n >= 1024 ? `${+(n / 1024).toFixed(n % 1024 ? 1 : 0)}GB` : `${n}MB`;
}

// ---------------------------------------------------------------------------
// Membership pricing. Premium is standalone; StatZ is a Premium ADD-ON.
// ---------------------------------------------------------------------------
export const TIER_PRICING = {
  premium: { monthly: 10, yearly: 90, addon: false },
  statz: { monthly: 5, yearly: 40, addon: true }, // additional cost on top of Premium
};

// Promo ladder for a lower-tier active user: 20% → (15m warning) 40% → 80% FINAL (60s).
export const PROMO_LADDER = [
  { id: "intro", off: 0.20, note: "Weekly upgrade offer", timerSec: null },
  { id: "warn", off: 0.40, note: "15 minutes left — better price", timerSec: 15 * 60 },
  { id: "final", off: 0.80, note: "FINAL offer", timerSec: 60 },
];
export function promoPrice(base, off) {
  return Math.round(base * (1 - off) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Feature gating by tier.
//  • SuggestionZ 😉  — PREMIUM trait (and above).
//  • Automations 🤖 / CallZ ☎️ — STATZ only.
// A tier includes everything from the tiers below it.
// ---------------------------------------------------------------------------
export const FEATURE_MIN_TIER = {
  suggestionz: "premium",
  automations: "statz",
  callz: "statz",
};
const TIER_RANK = { free: 0, premium: 1, statz: 2, debug: 3 };
export function tierMeets(tier, minTier) {
  return (TIER_RANK[tierKey(tier)] ?? 0) >= (TIER_RANK[tierKey(minTier)] ?? 0);
}
export function canUseFeature(tier, feature) {
  return tierMeets(tier, FEATURE_MIN_TIER[feature] || "free");
}

// ---------------------------------------------------------------------------
// Trials. Free users trial Premium apps (incl. SuggestionZ); Premium users
// trial StatZ automations & CallZ. Only StatZ users run automations outright.
// ---------------------------------------------------------------------------
export const TRIALS = {
  free: { grants: "premium", label: "Premium apps & SuggestionZ", perDaySec: 4 * 3600, warnBeforeSec: 15 * 60 },   // 4h/day, 15m warning
  premium: { grants: "statz", label: "StatZ Automations & CallZ", perDaySec: 4 * 60, warnBeforeSec: 15 },          // 4m/day, 15s warning
};

// ---------------------------------------------------------------------------
// Rating-price logic. A creator's price per skill used on posted media is
// adjusted by the community rating (out of 10). Needs 3+ separate raters.
// adjustment = (median - 5) * 10%  →  6+ median earns a bonus, <5 discounts.
// Raters earn 1 energy per rating they leave.
// ---------------------------------------------------------------------------
export const RATING_MIN_RATERS = 3;
export const RATING_ENERGY_PER_RATE = 1;

export function median(nums) {
  const a = [...(nums || [])].map(Number).filter((n) => !Number.isNaN(n)).sort((x, y) => x - y);
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

// Returns { price, factor, med, rated }. With <3 raters, price is unchanged.
export function ratedPrice(basePrice, ratings) {
  const base = Number(basePrice) || 0;
  const list = (ratings || []).filter((r) => r != null);
  if (list.length < RATING_MIN_RATERS) return { price: base, factor: 1, med: median(list), rated: false };
  const med = median(list);
  const factor = 1 + (med - 5) * 0.10; // median 5 → 1.0, 6 → 1.1, 10 → 1.5, 3 → 0.8
  const price = Math.max(0, Math.round(base * factor * 100) / 100);
  return { price, factor, med, rated: true };
}
