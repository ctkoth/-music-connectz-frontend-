// Shared client-side social layer for the logged-in Music ConnectZ shell.
// The reference blueprint app is localStorage-first, so PostZ / SpecZ /
// NationalitieZ state lives here until the backend exposes matching endpoints.
// Everything is keyed under `mcz_social_v1` and namespaced per signed-in user.

const KEY = "mcz_social_v1";

/** A persona is a display string here. ProfileZ used to store the whole
 *  {key, name, skills} object, which React refuses to render as a child.
 *
 *  The third shape is one nobody designed: a string holding the PRINTED form
 *  of a dict — "{'name': 'Independent Artist', 'emoji': '🎤', 'skills': []}"
 *  — written by a since-fixed server path. The server repairs it now, but this
 *  runs against whatever a browser has cached and whatever is in localStorage,
 *  so it recovers the name here too rather than putting machine noise on
 *  somebody's own profile while a deploy catches up. */
const personaName = (p) => {
  if (p && typeof p === "object") return p.name || p.key || "";
  const s = String(p || "");
  if (s.startsWith("{") && s.endsWith("}")) {
    // Single-quoted keys are Python's str(); JSON.parse wants double. Pull the
    // name out with a pattern rather than trying to parse a dialect we did not
    // write — a failed match falls through to the raw string, which is what
    // was already being shown.
    const m = s.match(/['"]name['"]\s*:\s*['"]([^'"]*)['"]/);
    if (m) return m[1];
  }
  return s;
};

export function loadSocial() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY)) || {};
    // Repair on read. The bad shape is already sitting in people's browsers,
    // so fixing only the write path would leave them crashing until they
    // happened to save their profile again.
    if (raw.profile && typeof raw.profile.persona === "object") {
      raw.profile = { ...raw.profile, persona: personaName(raw.profile.persona) };
    }
    if (Array.isArray(raw.members)) {
      raw.members = raw.members.map((m) =>
        m && typeof m.persona === "object" ? { ...m, persona: personaName(m.persona) } : m);
    }
    return raw;
  } catch {
    return {};
  }
}

export { personaName };

export function saveSocial(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
  // Let other mounted tabs know the shared store changed.
  window.dispatchEvent(new Event("mcz-social"));
}

export function patchSocial(patch) {
  const cur = loadSocial();
  const next = { ...cur, ...(typeof patch === "function" ? patch(cur) : patch) };
  saveSocial(next);
  return next;
}

// StatZ is the top tier in the blueprint economy — SpecZ purchasing and
// authoring is gated to it.
export function isStatZ(me) {
  return String(me?.tier || "").toLowerCase() === "statz";
}

// Blueprint post-window rules (seconds):
//  • A post must be OPEN 30s before another user may rate it.
//  • A post must be OPEN 60s before another user may comment on it.
export const RATE_WINDOW_SEC = 30;
export const COMMENT_WINDOW_SEC = 60;

// NationalitieZ — user-selected heritage/ancestry, filterable on Social ConnectZ.
export const NATIONALITIES = [
  ["🌍", "African American"], ["🇳🇬", "Nigerian"], ["🇬🇭", "Ghanaian"], ["🇪🇹", "Ethiopian"],
  ["🇿🇦", "South African"], ["🇰🇪", "Kenyan"], ["🇪🇬", "Egyptian"], ["🇲🇦", "Moroccan"],
  ["🇺🇸", "American"], ["🇨🇦", "Canadian"], ["🇲🇽", "Mexican"], ["🇧🇷", "Brazilian"],
  ["🇯🇲", "Jamaican"], ["🇭🇹", "Haitian"], ["🇩🇴", "Dominican"], ["🇵🇷", "Puerto Rican"],
  ["🇨🇺", "Cuban"], ["🇨🇴", "Colombian"], ["🇦🇷", "Argentine"], ["🇵🇪", "Peruvian"],
  ["🇬🇧", "British"], ["🇮🇪", "Irish"], ["🇫🇷", "French"], ["🇩🇪", "German"],
  ["🇮🇹", "Italian"], ["🇪🇸", "Spanish"], ["🇵🇹", "Portuguese"], ["🇬🇷", "Greek"],
  ["🇵🇱", "Polish"], ["🇺🇦", "Ukrainian"], ["🇷🇺", "Russian"], ["🇸🇪", "Swedish"],
  ["🇳🇱", "Dutch"], ["🇹🇷", "Turkish"], ["🇮🇱", "Israeli"], ["🇱🇧", "Lebanese"],
  ["🇸🇦", "Saudi"], ["🇮🇷", "Iranian"], ["🇮🇳", "Indian"], ["🇵🇰", "Pakistani"],
  ["🇧🇩", "Bangladeshi"], ["🇨🇳", "Chinese"], ["🇯🇵", "Japanese"], ["🇰🇷", "Korean"],
  ["🇻🇳", "Vietnamese"], ["🇵🇭", "Filipino"], ["🇹🇭", "Thai"], ["🇮🇩", "Indonesian"],
  ["🇦🇺", "Australian"], ["🇳🇿", "Māori / NZ"], ["🌺", "Pacific Islander"], ["🪶", "Native American"],
];

// Apps SpecZ can be attached to (used by the SpecZ store dropdown).
// SPEC_APPS lived here — a hardcoded list of the apps a SpecZ could attach to.
// The server publishes it now (`GET /api/economy/specz/` → `apps`), because a
// second copy of a list the server validates against is a list that drifts,
// and the tab would have started offering apps the API refuses.
