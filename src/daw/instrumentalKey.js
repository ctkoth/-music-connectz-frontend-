// Which tracks make up "the instrumental", and what the detected key is called in a session's key list.
//
// Key detection reads pitch, and two things in a session have none or the wrong kind: drums have no pitch, and a lead vocal
// follows the melody rather than the harmony under it. So the instrumental is every track that is not a lead vocal, a backing
// vocal or drums. The role is the track's own (set on import) or a guess from its file name (`guessRole`). Nothing is
// invented: with no such track the caller says so and falls back to the whole mix, and says THAT too.
import { guessRole } from "../mastering/multitrack.js";
import { SESSION_KEYS } from "./session.js";

const NOT_INSTRUMENTAL = new Set(["lead", "backing", "drums"]);

/** The tracks to listen to for the key: those with audio on them that are not vocals or drums. [] when there are none. */
export function instrumentalTracks(tracks, hasAudio = () => true) {
  return (tracks || []).filter((t) => hasAudio(t) && !NOT_INSTRUMENTAL.has(t.role || guessRole(t.name)));
}

const FLAT = { "C#": "Db", "D#": "Eb", "G#": "Ab", "A#": "Bb" };

/** The session's own name for a detected key ({root:"C#", mode:"major"} -> "Db major"), or "" when its list has none. */
export function sessionKeyFor(key) {
  if (!key || !key.root || !key.mode) return "";
  const root = key.mode === "major" ? (FLAT[key.root] || key.root) : (key.root === "D#" ? "Eb" : key.root === "A#" ? "Bb" : key.root);
  const name = `${root} ${key.mode}`;
  return SESSION_KEYS.includes(name) ? name : "";
}

/** One plain sentence saying what was heard, from what, and how sure. */
export function keySentence(key, names = [], wholeMix = false) {
  if (!key) return "I couldn't find a clear key in this audio — it may be drums, very short or very noisy. Set it by hand if you know it.";
  const from = wholeMix ? "the whole mix (no instrumental track found, so vocals and drums were included)" : `the instrumental (${names.join(", ")})`;
  const unsure = key.margin != null && key.margin < 0.05 ? " It was close between a few keys, so treat it as a starting point." : "";
  return `The key sounds like ${key.label}, estimated from ${from}. Its relative key, ${key.relative}, uses the same notes, so one of the two may fit your song better.${unsure}`;
}

const VOCALS = new Set(["lead", "backing"]);

/** The tracks to listen to for the TEMPO: everything but the vocals. Unlike the key, drums stay in — they carry the pulse. */
export function rhythmTracks(tracks, hasAudio = () => true) {
  return (tracks || []).filter((t) => hasAudio(t) && !VOCALS.has(t.role || guessRole(t.name)));
}

/** One plain sentence about the tempo heard, with the half/double-time twin named rather than hidden. */
export function tempoSentence(t, names = [], wholeMix = false) {
  if (!t) return "I couldn't find a steady beat to count — it may be a pad, free-time or very short. Set the BPM by hand if you know it.";
  const from = wholeMix ? "the whole mix" : `the beat (${names.join(", ")})`;
  const twin = t.alt ? ` If it feels twice as fast or half as fast, ${t.alt} BPM is the other likely reading.` : "";
  const weak = t.strength < 0.25 ? " The pulse is not very clear, so check it against the click." : "";
  return `The tempo sounds like ${t.bpm} BPM, estimated from ${from}.${twin}${weak}`;
}
