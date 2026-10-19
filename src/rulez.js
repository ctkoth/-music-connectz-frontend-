// The house rules, read from the server, never retyped into a screen.
//
// Same reason `limits.js` exists: a number stated in two places drifts, and
// "20 free prompts" ended up in nine of them. A RULE drifting is worse than a
// number drifting, because a rule is something members are held to — and being
// held to a rule that reads differently on the screen that told you about it
// is the version of unfair that people leave over.
//
// `/api/economy/rulez/` is open logged-out on purpose: the rule about how many
// accounts a person gets is needed most on the signup form, which is the one
// screen where nobody is signed in yet.
import { api } from "./api.js";

let cached = null;

/** Every rule, or [] if the server can't be reached. A screen that can't load
 *  the rules shows no rule rather than a remembered one — a stale rule stated
 *  confidently is the thing this file exists to prevent. */
export async function loadRules() {
  if (cached) return cached;
  try {
    const d = await api("/api/economy/rulez/");
    cached = Array.isArray(d?.rules) ? d.rules : [];
  } catch {
    cached = [];
  }
  return cached;
}

/** One rule by key, or null. */
export async function loadRule(key) {
  const rules = await loadRules();
  return rules.find((r) => r.key === key) || null;
}
