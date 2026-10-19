// Pure decisions for the coach's second pass and gear advice. Imports nothing
// that reads import.meta.env so it runs under plain node (coachUpgrades.test.mjs).
// It decides NOTHING about prices, markets or citations: all of that is served.

export const NOT_USED = "Listener's notes only — the logic check wasn't available this time.";

/** "Listeners 9.2 (14 ratings) · Coach 7", or "" when the server sent no real ratings. */
export function listenersLine(listeners, score) {
  if (!listeners || listeners.median == null || !listeners.count) return "";
  const coach = typeof score === "number" ? ` · Coach ${score}` : "";
  return `Listeners ${listeners.median} (${listeners.count} ratings)${coach}`;
}

/** Rows for "What the coach heard": low confidence is labelled possible, never hidden. */
export function heardRows(heard, labels = {}) {
  return (Array.isArray(heard) ? heard : [])
    .filter((h) => h && h.what)
    .map((h) => ({
      time: h.t || "",
      what: h.what,
      dim: h.dim && h.dim !== "other" ? (labels[h.dim] || "") : "",
      possible: Number(h.confidence) < 2,
    }));
}

/** The one line saying whether the logic check ran. */
export function thinkLine(think) {
  if (!think) return "";
  if (think.used) return "Checked by the coach's second pass";
  return think.reason || NOT_USED;
}

/** Only http(s) links are ever rendered as links. */
export function safeHref(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

/** The price split the server quoted, as parts the button can colour. Never computed here. */
export function payParts(q) {
  if (!q || q.cost_cents == null) return null;
  return {
    cost: q.cost_cents,
    promptz: q.pay_promptz || 0,
    cash: q.pay_cash_cents || 0,
    affordable: q.affordable !== false,
  };
}

/** "Links go to: Amazon US, eBay US" from the served markets. */
export function marketsLine(markets) {
  const names = (markets || []).map((m) => m.label).filter(Boolean);
  return names.length ? `Links go to: ${names.join(", ")}` : "";
}
