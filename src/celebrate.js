// The moment something is earned or spent, made visible: a "+20 🍥" chip that
// floats up, the matching sound, and the header balances refreshed so they
// count to their new value. Green plus for what arrives, ember minus for what
// leaves — the cost/gain rule, animated.
//
// Only call this for something the SERVER confirmed. A celebration for a
// reward that didn't land is the substance rule's failure with confetti on it.
import { playSound } from "./sound.js";
import { ENERGY, MONEY, PROMPTZ, SPINAZ, XP } from "./resources.js";

const SOUND = {
  spinaz: ["spinaz_gain", "spinaz_spend"],
  energy: ["energy_gain", "energy_spend"],
  money: ["money_earn", "money_spend"],
  promptz: ["xp_gain", "promptz_spend"],
  xp: ["xp_gain", "xp_gain"],
};
export const EMOJI = { spinaz: SPINAZ, energy: ENERGY, money: MONEY, promptz: PROMPTZ, xp: XP };

/** celebrate("spinaz", 20) · celebrate("money", -150) · celebrate(null, 0, { label: "Level up!", sound: "level_up", big: true }) */
export function celebrate(resource, amount = 0, { label = "", sound, big = false } = {}) {
  const gain = amount >= 0;
  const key = sound ?? (resource ? SOUND[resource]?.[gain ? 0 : 1] : null);
  if (key) playSound(key);
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mcz-celebrate", { detail: { resource, amount, label, gain, big } }));
  if (resource) window.dispatchEvent(new CustomEvent("mcz-stats-refresh"));
}
