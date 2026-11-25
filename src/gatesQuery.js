// The member search's own spelling of the five range gates, and nothing else.
//
// RangeGates speaks the server's gate shape — {key: [min, max]}, km max-only — which is what a
// gated post or deal stores. `GET /api/economy/members/` takes the same ranges as flat params
// (rating_min, attr_max, max_km, …). This is the one translation, so VybeZ and Social ConnectZ
// cannot spell them two ways. It decides nothing: the server evaluates every range, and an
// empty range asks nothing of anyone.
const PARAM = { rating: "rating", price: "price", attract: "attr", age: "age" };

export const CLASS_KEYS = ["thuro", "sexi", "thorough"];

/** How many gates are set: ranges and classes both count. */
export const gatesSet = (gates) => Object.entries(gates || {})
  .filter(([k, v]) => (CLASS_KEYS.includes(k) ? v === true : Array.isArray(v))).length;

/** Flip one class on a gates value. Off removes the key, so "no gate" stays an empty object. */
export function toggleClass(gates, key) {
  const next = { ...(gates || {}) };
  if (next[key] === true) delete next[key]; else next[key] = true;
  return next;
}

export function gatesQuery(gates) {
  const parts = [];
  for (const [key, base] of Object.entries(PARAM)) {
    const pair = Array.isArray(gates?.[key]) ? gates[key] : null;
    if (!pair) continue;
    if (pair[0] != null && !Number.isNaN(pair[0])) parts.push(`${base}_min=${pair[0]}`);
    if (pair[1] != null && !Number.isNaN(pair[1])) parts.push(`${base}_max=${pair[1]}`);
  }
  const km = Array.isArray(gates?.km) ? gates.km[1] : null;
  if (km != null && !Number.isNaN(km)) parts.push(`max_km=${km}`);
  // The one-tap classes (ThuroZ, SeXi): a yes on the gate, a flag on the search.
  for (const key of CLASS_KEYS) if (gates?.[key] === true) parts.push(`${key}=1`);
  return parts;
}
