// The Casino look: marquee-bulb cards, gold and ruby accents, and a coin shower on a big win.
//
// It is paint. Nothing here chooses an outcome, draws a number, or pays anything: the coin shower fires only from
// celebrate(..., { big: true }), which is only called for something the SERVER confirmed, and every amount shown is the
// server's. There is no spin, no near-miss and no fake jackpot — a casino's lights without a casino's odds.
//
// Off until the member turns it on (like sound), remembered on this device, and switched off for
// prefers-reduced-motion by index.css (the colours stay, the movement goes).

const KEY = "mcz_casino";

export function isCasinoLook() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

/** Put the preference on the page. Safe to call before React and more than once. */
export function applyCasinoLook(on = isCasinoLook()) {
  if (typeof document === "undefined") return;
  if (on) document.documentElement.setAttribute("data-casino", "1");
  else document.documentElement.removeAttribute("data-casino");
}

export function setCasinoLook(on) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* applies for this page, just not remembered */ }
  applyCasinoLook(!!on);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("mcz-casino-changed", { detail: !!on }));
}

/** How many coins a win throws. More for a bigger moment, never a function of the amount's size: a bigger number must not
 *  look like a bigger prize than it is, and a phone should not draw a hundred. */
export function coinCount({ big = false, casino = false } = {}) {
  if (!big) return 0;
  return casino ? 28 : 12;
}

/** Deterministic spread for coin i of n: left %, delay s, fall s, drift px. No Math.random, so it is the same every time
 *  and testable — the shower is decoration, and decoration has no business being a source of randomness. */
export function coinSpec(i, n) {
  const f = (i + 0.5) / Math.max(1, n);
  const wobble = ((i * 37) % 17) / 17;
  return {
    left: Math.round(f * 100),
    delay: Math.round(((i * 53) % 40) * 10) / 1000,
    fall: 1.1 + wobble * 0.9,
    drift: Math.round((wobble - 0.5) * 80),
  };
}
