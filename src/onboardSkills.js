// The OnboardZ "add your skills, persona by persona" step, as pure decisions (runs under plain node).
//
// A member's skills live UNDER the persona they belong to (Pro Tools under Mix Engineer, Rapping under
// Independent Artist), so the step walks the personas the member already claimed and says which still
// have none. It reads what is on the profile and decides nothing about it.
import { PERSONA_LABELS } from "./personaSkills.js";

const asPersona = (p) => (typeof p === "string" ? { key: p, name: p, skills: [] } : p || {});

/** [{key, label, count}] — one row per persona the member holds, in the order they hold them. */
export function personaSkillRows(personas) {
  return (personas || []).map(asPersona).filter((p) => p.key || p.name).map((p) => ({
    key: p.key || p.name,
    label: PERSONA_LABELS[p.key] || p.name || p.key,
    count: Array.isArray(p.skills) ? p.skills.filter((s) => s && (s.name || typeof s === "string")).length : 0,
  }));
}

/** Done once ANY persona has a skill. Not "every persona": a member who claims five hats is not
 *  held at the door until all five are filled — the rest are shown as still open, and doing them
 *  later is one tap away. */
export const skillsStepDone = (personas) => personaSkillRows(personas).some((r) => r.count > 0);

/** The persona rows that still have nothing, for the nudge. */
export const personasWithoutSkills = (personas) => personaSkillRows(personas).filter((r) => r.count === 0);
