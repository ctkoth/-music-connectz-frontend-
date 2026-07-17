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
