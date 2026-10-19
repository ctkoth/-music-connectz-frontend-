// VoiceZ — how hard the app talks to THIS member.
//
// Three switches, served off /api/auth/me/ like every tier number, because a
// house voice hardcoded in twenty-eight files is the same bug as the "20 free
// prompts" figure that drifted into nine places. Copy asks for a phrase and
// gets the strongest version this member allows.
//
//   say({ plain: "Rated 8/10", slang: "8/10, locked in" }, voice)
//
// The switches are independent on purpose: somebody can want the slang
// without the swearing, or the swearing without a screen full of emoji.
//
// THE EMOJI SWITCH DOES NOT TOUCH THE RESOURCE MARKS. ⚡ 🍥 🏷️ 💵 ⭐ are not
// decoration — they are the unit. CLAUDE.md's rule is "always the resource
// emoji, never a bare number", and turning "+1 ⚡" into "+1" would delete
// which currency arrived, which is the one thing that line exists to say. So
// the switch strips ornament (🎤 ✨ 🔥 👋) and leaves the units alone.
import { useEffect, useState } from "react";
import { api, tokenStore } from "./api.js";
import { ENERGY, MONEY, PROMPTZ, SPINAZ, XP } from "./resources.js";

// The house voice, and what a logged-out visitor gets: this is how Music
// ConnectZ talks unless somebody says otherwise.
export const DEFAULT_VOICE = { explicit: false, emoji: true, slang: true, explicit_allowed: false };

// Compared with variation selectors dropped, so 🏷️ matches 🏷.
const bare = (s) => String(s).replace(/️/g, "");
const UNITS = new Set([ENERGY, SPINAZ, PROMPTZ, MONEY, XP].map(bare));

/** Strip ornamental emoji, keep the resource units. */
export function stripOrnament(text) {
  return String(text ?? "")
    .replace(
      // One cluster: a pictograph plus any variation selectors, skin tones or
      // ZWJ-joined parts, so a multi-codepoint emoji goes as one thing rather
      // than leaving half of itself behind.
      /\p{Extended_Pictographic}(️|[\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic})*/gu,
      (m) => (UNITS.has(bare(m)) ? m : ""),
    )
    // Tidy the holes the removals leave: doubled spaces, a space before
    // punctuation, and a dangling separator at either end.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/^[\s·—–-]+|[\s·—–-]+$/g, "")
    .trim();
}

/**
 * Pick the strongest variant this member allows, then apply the emoji switch.
 *
 * `plain` is required and is the floor — every phrase has to work with every
 * switch off, which also means a phrase can add a slang or explicit variant
 * later without anything else changing.
 */
export function say(variants, voice = DEFAULT_VOICE) {
  const v = { ...DEFAULT_VOICE, ...(voice || {}) };
  const picked =
    (v.explicit && variants.explicit) ||
    (v.slang && variants.slang) ||
    variants.plain ||
    "";
  return v.emoji ? picked : stripOrnament(picked);
}

/* ------------------------------------------------------------------ state */

let cache = null;                 // last voice read from the server
let inflight = null;

function broadcast(v) {
  cache = v;
  window.dispatchEvent(new CustomEvent("mcz-voice-changed", { detail: v }));
}

/** Push a change to the server, then tell every mounted screen. Returns the
 *  server's answer so a caller can surface a refusal — the explicit switch
 *  400s for an account too young for it, and that has to be shown, not
 *  swallowed. */
export async function saveVoice(patch) {
  const me = await api("/api/auth/me/", { method: "PATCH", body: { voice: patch } });
  broadcast(me?.voice || DEFAULT_VOICE);
  return me?.voice || DEFAULT_VOICE;
}

/** The member's voice. Starts from the house default so copy renders on the
 *  first frame rather than flickering, and re-renders when the answer lands
 *  or another screen changes it. */
export function useVoice() {
  const [voice, setVoice] = useState(cache || DEFAULT_VOICE);
  useEffect(() => {
    const h = (e) => setVoice(e.detail || DEFAULT_VOICE);
    window.addEventListener("mcz-voice-changed", h);
    // A logged-out visitor has no voice to fetch and gets the house one, so
    // don't spend a doomed 401 on it — /try is the busiest page here and it
    // has no session by definition.
    if (!cache && tokenStore.get()) {
      // One request for the whole app, however many screens ask at once.
      inflight = inflight || api("/api/auth/me/").catch(() => null);
      inflight.then((me) => {
        inflight = null;
        if (me?.voice) broadcast(me.voice);
      });
    }
    return () => window.removeEventListener("mcz-voice-changed", h);
  }, []);
  return voice;
}

/** `const talk = useSay(); talk({ plain, slang, explicit })` */
export function useSay() {
  const voice = useVoice();
  return (variants) => say(variants, voice);
}
