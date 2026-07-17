// Developer tax — the platform's cut on every transaction, enforced by tier.
// Free 5% · Premium 3% · StatZ 2%. All transactions surface this transparently.

export function devTaxFor(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return { label: "StatZ", rate: 0.02 };
  if (t.includes("premium") || t.includes("pro")) return { label: "Premium", rate: 0.03 };
  return { label: "Free", rate: 0.05 };
}

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Split a transaction of `amount` into the developer's cut and the remainder.
export function splitTransaction(amount, tier) {
  const { label, rate } = devTaxFor(tier);
  const gross = Number(amount) || 0;
  const dev = Math.round(gross * rate * 100) / 100;
  const net = Math.round((gross - dev) * 100) / 100;
  return { gross, dev, net, rate, label };
}

// Per-tier caps — mirrors apps/economy/catalog.py on the backend so the client
// can enforce/preview limits offline. char_limit for text, upload/storage in MB.
export const TIER_LIMITS = {
  free: { char_limit: 400, upload_mb: 40, storage_mb: 400 },
  premium: { char_limit: 4000, upload_mb: 400, storage_mb: 5120 },
  statz: { char_limit: 40000, upload_mb: 4096, storage_mb: 102400 },
};

export function limitsFor(tier) {
  const { label } = devTaxFor(tier);
  return { ...TIER_LIMITS[label.toLowerCase()], tier: label.toLowerCase() };
}

// Human-friendly storage/upload label: 400 -> "400MB", 5120 -> "5GB".
export function mbLabel(mb) {
  const n = Number(mb) || 0;
  return n >= 1024 ? `${+(n / 1024).toFixed(n % 1024 ? 1 : 0)}GB` : `${n}MB`;
}
