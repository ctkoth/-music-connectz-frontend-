// The MercheZ shop split, previewed on the listing form before anything is sent. The rule and every number in it
// (printer costs, tax rates) are the server's, from /api/economy/merch/shop/; after listing, the server's own split
// is what is shown. Pure, tested under node.
export function previewSplit(meta, product, markupCents, rate) {
  const base = meta?.base_cents?.[product];
  if (base == null) return null;
  const m = Math.max(0, Math.round(Number(markupCents) || 0));
  const dev = Math.round(m * rate);
  return { price: base + m, printer: base, dev_tax: dev, designer: m - dev };
}

export function keepsRange(meta, product, markupCents) {
  const rates = Object.values(meta?.dev_tax || {});
  if (!rates.length || meta?.base_cents?.[product] == null) return null;
  const k = rates.map((r) => previewSplit(meta, product, markupCents, r).designer);
  return { min: Math.min(...k), max: Math.max(...k) };
}

export const usd = (c) => `$${(c / 100).toFixed(2)}`;
