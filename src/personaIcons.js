// PersonaZ icon variants.
//
// A PersonaZ is always free to pick. Some of them ship more than one piece of
// art, and an alternate can be marked `premium` — that gates the ARTWORK only,
// never the role itself. The member's choice is local to their device, the same
// convention the PickConnectZ dock uses for pins.
import { readStore, writeStore } from "./PickConnectZ.jsx";

const KEY = "mcz_persona_icons";

export const PERSONA_ICON_VARIANTS = {
  designer: [
    { icon: "personaz_designer.png", label: "Standard" },
    { icon: "personaz_designer_manga.png", label: "Manga", premium: true },
  ],
};

/** The whole {personaKey: iconFilename} map the member has chosen. */
export const loadPersonaIcons = () => readStore(KEY) || {};

/** The icon to render for a persona: their pick if it's still valid, else the default. */
export function personaIcon(personaKey, fallback, chosen = loadPersonaIcons()) {
  const variants = PERSONA_ICON_VARIANTS[personaKey];
  const pick = chosen[personaKey];
  if (!variants || !pick) return fallback;
  return variants.some((v) => v.icon === pick) ? pick : fallback;
}

/** Record a choice and return the updated map. */
export function setPersonaIcon(personaKey, icon) {
  const next = { ...loadPersonaIcons(), [personaKey]: icon };
  writeStore(KEY, next);
  return next;
}
