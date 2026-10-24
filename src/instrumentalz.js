// The small, pure decisions Instrumental ConnectZ's screen makes. Kept out of the
// component so they run under plain node: which drum voice the preview uses, what
// the .mid is called, and which of the parts a member asked for did not come back.
// The loop, its keys and its price are the server's; this only chooses what to SHOW.
import { PROMPTZ } from "./resources.js";

/**
 * The preview's noise voice for a General MIDI drum note (the kick is its own
 * oscillator and never reaches here). Open hat (46) and the cymbals (49 and up)
 * ring for 0.4s; closed hats (42-45) are a short tick; everything below is a
 * snare/clap-sized burst.
 *
 * The ring was tested AFTER `pitch >= 42`, which every one of those notes also
 * satisfies, so the long branch could never run and an open hat or crash played
 * as a 60ms tick.
 */
export function drumVoice(pitch) {
  const hat = pitch >= 42;
  const ring = pitch === 46 || pitch >= 49;
  return {
    len: ring ? 0.4 : hat ? 0.06 : 0.15,
    filter: hat ? "highpass" : "bandpass",
    freq: hat ? 7000 : 1800,
  };
}

/**
 * The .mid's file name. '#' is spelled out before anything is stripped: it is not
 * a word character, so "F# minor" used to become "Fminor" — a different key — in
 * the member's downloads folder.
 */
export function midiName(work) {
  const slug = (t) => String(t || "").replace(/#/g, "sharp").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  const genre = slug(work?.genre) || "instrumental";
  const key = String(work?.key || "").replace(/#/g, "sharp").replace(/[^\p{L}\p{N}]+/gu, "");
  return `${genre}-${key}-${work?.bpm}bpm.mid`;
}

/**
 * The instrument ids that were asked for and did not come back. The server's own
 * list (`missing`) wins when it sends one; otherwise it is the comparison of what
 * the piece was made for (`instruments`) against the parts it holds (`tracks`).
 * The model may return fewer parts than it was asked for, and that is still a
 * loop — so the only way anyone learns a part is absent is being told.
 */
export function missingParts(work) {
  if (Array.isArray(work?.missing)) return [...new Set(work.missing.map(String))];
  const asked = Array.isArray(work?.instruments) ? work.instruments : [];
  const got = new Set((work?.tracks || []).map((t) => t.instrument));
  return [...new Set(asked.filter((i) => !got.has(i)))];
}

/** "Piano and bass", "Piano, bass and drums" — the first as written, the rest lower-cased. */
export function joinParts(ids, labelOf) {
  const names = ids.map((i, n) => {
    const l = String(labelOf?.(i) || i);
    return n === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1);
  });
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "Piano and bass didn't come back." — or "" when everything did. */
export function missingLine(work, labelOf) {
  const ids = missingParts(work);
  return ids.length ? `${joinParts(ids, labelOf)} didn't come back.` : "";
}

/**
 * Whether the run that made this piece was charged, in the server's own words
 * for it. `charged_cents` is on the POST response (0 when a free prompt covered
 * the run). Without it — an older API — it says only what is certain: a loop
 * with a part missing is still a loop, and it counted as a normal run.
 */
export function chargeLine(run) {
  const c = run?.charged_cents;
  if (typeof c === "number") {
    return c > 0 ? `Charged as a normal run: −${c} ${PROMPTZ}.` : "Not charged — a free prompt covered it.";
  }
  return "It counted as a normal run.";
}
