// Reward reels: a slot machine's reveal, for a reward that is already decided.
//
// The reels DISPLAY a result; they never choose one. By the time they spin, the server has paid the amount and
// celebrate() has been called with it, so the reels are a slow way of reading a number. What that rules out, on purpose:
//   - no random symbol and no random landing (every strip is deterministic and the last symbol is the true one),
//   - no stake, no second spin, no purchase, no near-miss dressed up as a loss,
//   - no reward that depends on the animation: closing the page changes nothing about what was paid.
// A slot's lights without a slot's odds. Members include 13-year-olds, and a 🍥 is worth a cent.
import { ENERGY, MONEY, PROMPTZ, SPINAZ, XP } from "./resources.js";

const FACES = { spinaz: SPINAZ, energy: ENERGY, money: MONEY, promptz: PROMPTZ, xp: XP };
const ORDER = ["spinaz", "energy", "promptz", "money", "xp"];
const DIGITS = "0123456789";
export const STRIP_LENGTH = 9;

/** The text a reward is read as: "1,250" for 1250 coins, "$12.50" for 1250 cents of money. The chip's own wording. */
export function rewardText(resource, amount) {
  const a = Math.abs(Number(amount) || 0);
  if (!a) return "";
  return resource === "money" ? `$${(a / 100).toFixed(2)}` : a.toLocaleString("en-US");
}

/** One strip per character of the reward, plus one for the resource. Each strip ends on the true symbol; the rest is a fixed
 *  walk through the same alphabet, so the same reward always spins the same way. */
export function reelStrips(resource, amount) {
  const text = rewardText(resource, amount);
  if (!text) return [];
  const strips = [];
  const face = FACES[resource];
  if (face) {
    const at = Math.max(0, ORDER.indexOf(resource));
    const walk = Array.from({ length: STRIP_LENGTH - 1 }, (_, k) => FACES[ORDER[(at + 1 + k) % ORDER.length]]);
    strips.push({ final: face, kind: "resource", symbols: walk.concat(face) });
  }
  for (const ch of text) {
    if (DIGITS.includes(ch)) {
      const d = Number(ch);
      const walk = Array.from({ length: STRIP_LENGTH - 1 }, (_, k) => DIGITS[(d + 1 + k) % 10]);
      strips.push({ final: ch, kind: "digit", symbols: walk.concat(ch) });
    } else {
      strips.push({ final: ch, kind: "fixed", symbols: [ch] }); // "," "." "$" do not spin
    }
  }
  return strips;
}

/** Stop times, left to right: each reel lands a little after the last, which is what makes it read as a machine. Seconds. */
export function stopAt(i) {
  return Math.round((0.5 + i * 0.16) * 100) / 100;
}
