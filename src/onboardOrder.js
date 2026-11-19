// The first session's order, as pure decisions (runs in node). A score first, then the actions that make a
// member stay (a post, ratings), then the profile fields, asked once the member has a reason to fill them.
import { FOCUS_COACHES } from "./focus.js";

export const CORE = ["score", "post", "rate"];          // what the completion bonus asks for
export const ORDER = ["score", "post", "rate", "profile", "skills", "birthday", "heritage", "refer"];

/** Steps in ORDER; unknown keys keep their place at the end. */
export const ordered = (steps) => [...steps].sort((a, b) => (ORDER.indexOf(a.key) + 99) % 99 - (ORDER.indexOf(b.key) + 99) % 99);
/** The one step to show up front: the first not done. */
export const nextStep = (steps) => ordered(steps).find((s) => !s.done) || null;
export const coreDone = (steps) => CORE.every((k) => steps.find((s) => s.key === k)?.done);

/** Which coach a new member's first score opens: the one they tried before joining, else one they picked
 *  ("I'm here for…" seeds), else SingZ. Only a real coach key is ever returned. */
export function firstCoach({ trialApp = "", seeds = [] } = {}) {
  if (FOCUS_COACHES.includes(trialApp)) return trialApp;
  return seeds.find((k) => FOCUS_COACHES.includes(k)) || "singz";
}
