// Shared client-side social layer for the logged-in Music ConnectZ shell.
// The reference blueprint app is localStorage-first, so PostZ / SpecZ /
// NationalitieZ state lives here until the backend exposes matching endpoints.
// Everything is keyed under `mcz_social_v1` and namespaced per signed-in user.

const KEY = "mcz_social_v1";

export function loadSocial() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

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
export const SPEC_APPS = [
  ["postz.png", "PostZ"], ["battlez.png", "BattleZ"], ["collabz.png", "CollabZ"],
  ["singz.png", "SingZ"], ["rapz.png", "RapZ"], ["labelz.png", "LabelZ"],
  ["groupz.png", "GroupZ"], ["social_connectz.png", "Social ConnectZ"],
  ["lessonz.png", "LessonZ"], ["messagez.png", "MessageZ"],
];
