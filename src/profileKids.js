// ProfileZ's children, and the unsaved / saved state of the profile.
//
// ProfileZ is one long form, and nine of the things in it are apps in their own
// right — ZodiacZ, PreferenceZ, SubstanceZ, LanguageZ, InVenTorieZ, ReligionZ and
// SocialZ each have art (`profilez.<child>.*` in public/icons), a tab or a control
// of their own, and a member search that reads what they declare. The children
// strip makes them visible AS children: what each one currently says about you,
// whether that is saved yet, and a way to land on the exact control.
//
// This file is the DECISIONS, kept free of React and of `import.meta.env` so plain
// node can test them (the same reason portfolio.js and sentencez.js are). It words
// and compares; it computes no rule of the platform's. Who is attracted to whom,
// what a frequency means and what a follower pays are the server's.

import { ENERGY } from "./resources.js";

// PreferenceZ — the genders a member is attracted to. Any one, any mix, or all.
// The metric tab reads this list from the server; the picker needs it before that
// answer arrives, and it is three values, so it lives here once and ProfileZ
// imports it rather than carrying a second copy.
export const PARTNER_GENDERS = [
  ["male", "Male", "♂"],
  ["female", "Female", "♀"],
  ["nonbinary", "Non-binary", "⚧"],
];

// `fields` are the names `fieldsOf` produces; a kid is "unsaved" when any of its
// fields differs from what was last saved. SocialZ has none: it saves itself, in
// its own screen, the moment a check finishes.
export const KIDS = [
  { key: "zodiacz", label: "ZodiacZ", icon: "zodiacz.png", spot: "birthday", fields: ["birthday"] },
  { key: "preferencez", label: "PreferenceZ", icon: "preferencez.png", spot: "preferencez", fields: ["partners"] },
  { key: "substancez", label: "SubstanceZ", icon: "substancez.png", spot: "substancez", fields: ["subs", "sober"] },
  { key: "languagez", label: "LanguageZ", icon: "languagez.png", spot: "languagez", fields: ["languages"] },
  { key: "inventoriez", label: "InVenTorieZ", icon: "inventoriez.png", spot: "inventoryz", fields: ["pf.inventory"] },
  { key: "religionz", label: "ReligionZ", icon: "religionz.png", spot: "religionz", fields: ["religion"] },
  { key: "socialz", label: "SocialZ", icon: "socialz.png", tab: "socialz", fields: [] },
];

// Everything else the Save button writes, named for the sentence that says what
// is unsaved. A field with no name here would be saved but never mentioned.
const OTHER_LABEL = {
  bio: "your bio", nationalities: "NationalitieZ", personas: "PersonaZ", personality: "PersonalitieZ",
  "pf.pronouns": "your pronouns", "pf.headline": "your headline", "pf.genres": "your genres",
  "pf.influences": "your influences", "pf.gear": "your gear", "pf.label": "your label",
  "pf.timezone": "your timezone", "pf.pinned_post_id": "your pinned post", "pf.cover_url": "your cover",
};

const PF_KEYS = ["pronouns", "headline", "genres", "influences", "gear", "inventory", "label", "timezone",
  "pinned_post_id", "cover_url"];

/** The values Save writes, as one flat object — what the screen holds, in the shape
 *  the comparison needs. `subs` is what is SENT (empty when sober), so toggling Sober
 *  with nothing declared is not a change the server would ever see. */
export function fieldsOf({ bio, birthday, nats, sel, partners, subs, sober, languages, religion, personality, pf }) {
  const out = {
    bio: bio || "", birthday: birthday || "", nationalities: nats || [], personas: sel || [],
    partners: partners || [], subs: sober ? {} : (subs || {}), sober: !!sober,
    languages: languages || {}, religion: religion || "", personality: personality || "",
  };
  for (const k of PF_KEYS) out[`pf.${k}`] = pf ? (pf[k] ?? null) : null;
  return out;
}

// Key order must not matter: a member who ticks Male then Female and one who ticks
// Female then Male have said the same thing, and an object rebuilt by the server
// may come back in a different order. So keys are sorted, and a LIST of strings is
// compared as a set (the pickers are unordered), while a list of objects keeps its
// order (a persona list and an inventory are ordered by the member).
function stable(v) {
  if (Array.isArray(v)) {
    const items = v.map(stable);
    return v.every((x) => typeof x === "string") ? [...items].sort() : items;
  }
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]));
  }
  return v;
}
export const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

/** The field names whose value differs between what was saved and what is held. */
export function changedFields(saved, now) {
  if (!saved || !now) return [];
  return Object.keys(now).filter((k) => !same(saved[k], now[k]));
}

/** Which children have something unsaved — a Set of kid keys. */
export function unsavedKids(changed) {
  const set = new Set();
  for (const kid of KIDS) if (kid.fields.some((f) => changed.includes(f))) set.add(kid.key);
  return set;
}

/** Names for everything unsaved, children first (they are what the member scans
 *  for), then the rest. A name appears once even if two of its fields moved. */
export function unsavedNames(changed) {
  const names = [];
  const add = (n) => { if (n && !names.includes(n)) names.push(n); };
  for (const kid of KIDS) if (kid.fields.some((f) => changed.includes(f))) add(kid.label);
  for (const f of changed) add(OTHER_LABEL[f]);
  return names;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** One line of what a child currently says about the member, or null when there is
 *  nothing true to say yet (the tile then offers the control instead). Never invents:
 *  a thing the member has not declared reads as not declared. */
export function kidLine(key, v = {}) {
  v = v || {};
  switch (key) {
    case "zodiacz": {
      if (!v.birthday) return null;
      const bits = [];
      if (v.zodiac) bits.push(v.zodiac);
      if (v.zodiac_cn?.animal) bits.push(`Year of the ${v.zodiac_cn.animal}`);
      return bits.length ? bits.join(" · ") : "Saved birthday — sign shows once you save";
    }
    case "preferencez": {
      const labels = PARTNER_GENDERS.filter(([k]) => (v.partners || []).includes(k)).map(([, l]) => l);
      return labels.length ? labels.join(", ") : null;
    }
    case "substancez": {
      if (v.sober) return "Sober by choice";
      const n = Object.keys(v.subs || {}).length;
      return n ? `${n} declared` : null;
    }
    case "languagez": {
      const n = Object.keys(v.languages || {}).length;
      return n ? plural(n, "language", "languages") : null;
    }
    case "inventoriez": {
      const n = (v.inventory || []).length;
      return n ? plural(n, "piece", "pieces") : null;
    }
    case "religionz": return v.religionLabel || (v.religion ? "Declared" : null);
    case "socialz": {
      const s = v.social;
      if (!s) return null;
      const bits = [`${s.counted} counted`];
      if (s.reach) bits.push(`reach ${Number(s.reach).toLocaleString()}`);
      if (s.energy_per_hour != null) bits.push(`${s.energy_per_hour} ${ENERGY}/hr`);
      return bits.join(" · ");
    }
    default: return null;
  }
}

/** The save bar's one sentence. `savedAt` is a Date or null. Three honest states: there
 *  is something unsaved (and what), everything is saved (and when), or nothing has
 *  changed since the page opened. */
export function saveState({ changed, busy, savedAt }) {
  if (busy) return { tone: "busy", text: "Saving…" };
  if (changed.length) {
    const names = unsavedNames(changed);
    const shown = names.slice(0, 4).join(", ") + (names.length > 4 ? ` +${names.length - 4} more` : "");
    return { tone: "dirty", text: `Unsaved changes — ${shown}` };
  }
  if (savedAt) {
    const t = savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return { tone: "saved", text: `All changes saved · ${t}` };
  }
  return { tone: "idle", text: "No changes yet" };
}
