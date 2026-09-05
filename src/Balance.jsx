// A balance that opens its own history.
//
// "You have 240 🍥" is a fact with nowhere to go, and this app has a rule
// against those. The number a member is looking at is exactly the moment they
// want to know what moved it — so every BALANCE (not every price) is a button
// that opens LogZ already filtered to that resource.
//
// Prices are deliberately left alone. "−1 🏷️ to run this" is a cost stated up
// front, and turning it into a link would put a navigation under the thing
// somebody is about to press.
import { goToView } from "./openTo.js";
import { ENERGY, MONEY, PROMPTZ, SPINAZ, XP } from "./resources.js";

const EMOJI = { spinaz: SPINAZ, energy: ENERGY, promptz: PROMPTZ, money: MONEY, xp: XP };
const NAME = { spinaz: "SpinaZ", energy: "Energy", promptz: "PromptZ", money: "money", xp: "XP" };

/**
 * @param {"spinaz"|"energy"|"promptz"|"money"|"xp"} resource
 * @param {number} amount     already in the resource's own unit
 * @param {string} label      optional word after the number ("earned", "SpinaZ")
 */
export default function Balance({ resource, amount, label = "", className = "", title }) {
  const emoji = EMOJI[resource] || "";
  const name = NAME[resource] || resource;
  return (
    <button
      type="button"
      onClick={() => goToView("logz", { resource })}
      title={title || `Open your ${emoji} movements — every one says what moved it`}
      className={`pill transition hover:!border-white/40 hover:!text-white active:scale-95 ${className}`}
    >
      {emoji} {Number(amount ?? 0).toLocaleString()} {label || name}
    </button>
  );
}
