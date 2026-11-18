// Tone presets: a track's effect chain saved under a name ("My vocal") and put back on any track.
//
// The member's own presets live on the server (/api/economy/tonez/ — theirs on every device, and the
// tier's ceiling: Free 3, Premium 6, StatZ unlimited). The STARTERS here are built-in voice chains to
// begin from: free, not counted, and made only of the built-in effects, so nothing here can sound any
// different in the bounce than it does on the speakers.
import { cleanInserts, newInsert } from "./plugins.js";

const fx = (type, params, on = true) => ({ ...newInsert(type), on, params: { ...newInsert(type).params, ...params } });
// An EQ as three bands (low shelf, bell, high shelf) — every starter fits the Free plan's three.
const eq = (lowGain, lowFreq, midGain, midFreq, midQ, highGain, highFreq) => ({ ...newInsert("eq"), bands: [
  { type: "lowshelf", f: lowFreq, gain: lowGain, q: 1 },
  { type: "peaking", f: midFreq, gain: midGain, q: midQ },
  { type: "highshelf", f: highFreq, gain: highGain, q: 1 }] });

export const STARTERS = [
  { key: "clean_vocal", name: "Clean vocal", what: "Rumble cut, a little presence and air, gentle compression, a short room.",
    chain: () => [fx("filter", { mode: 1, freq: 90, q: 0.7 }),
      eq(-2, 200, 2, 3000, 1, 3, 10000),
      fx("comp", { threshold: -20, ratio: 3, attack: 5, release: 120, knee: 6, makeup: 4 }),
      fx("reverb", { decay: 1.2, predelay: 20, mix: 12 })] },
  { key: "rap_upfront", name: "Rap vocal, upfront", what: "Tight and in your face: firm compression, bite around 2.5 kHz, a short slap.",
    chain: () => [fx("filter", { mode: 1, freq: 100, q: 0.7 }),
      eq(-3, 250, 3, 2500, 1.2, 2, 9000),
      fx("comp", { threshold: -24, ratio: 4, attack: 3, release: 80, knee: 4, makeup: 6 }),
      fx("delay", { time: 110, sync: 0, feedback: 10, mix: 8 })] },
  { key: "warm_rnb", name: "Warm R&B vocal", what: "Body in the lows, harshness tucked away, slow smooth compression, a big soft hall.",
    chain: () => [fx("filter", { mode: 1, freq: 70, q: 0.7 }),
      eq(2, 120, -2, 3500, 1, 1.5, 12000),
      fx("comp", { threshold: -18, ratio: 2.5, attack: 10, release: 200, knee: 10, makeup: 3 }),
      fx("reverb", { decay: 2.4, predelay: 30, mix: 22 })] },
  { key: "radio_voice", name: "Radio / phone voice", what: "Only the middle of the voice survives: the lows and highs are cut away.",
    chain: () => [fx("filter", { mode: 1, freq: 400, q: 0.9 }), fx("filter", { mode: 0, freq: 3200, q: 0.9 }),
      eq(0, 100, 6, 1500, 1.5, 0, 8000),
      fx("comp", { threshold: -20, ratio: 6, attack: 5, release: 100, knee: 3, makeup: 6 })] },
  { key: "adlibs_far", name: "Ad-libs, wide and far", what: "Thinned out and pushed back with an echo on the beat and a long tail, so the lead stays in front.",
    chain: () => [fx("filter", { mode: 1, freq: 150, q: 0.7 }),
      eq(-2, 250, 0, 1000, 1, 3, 8000),
      fx("delay", { time: 375, sync: 0.75, feedback: 35, mix: 30 }),
      fx("reverb", { decay: 3, predelay: 40, mix: 35 })] },
];

/** A stored chain made into fresh inserts for a track: new ids, every value back in range. */
export function chainToInserts(chain) {
  return cleanInserts((Array.isArray(chain) ? chain : []).map((c) => ({ ...c, id: newInsert(c?.type)?.id })));
}

/** What gets saved: the effects, their on/off and their settings — not the ids, which belong to a track. */
export function insertsToChain(inserts) {
  return cleanInserts(inserts).map(({ type, on, params, bands }) => ({ type, on, params, ...(bands ? { bands } : {}) }));
}

/** How one kind's ceiling reads beside its save button. Each kind (tone, fx, master) counts on its own. */
export function presetRoom(state, kind = "tone") {
  if (!state) return { ok: true, line: "" };
  const count = state.kinds?.[kind]?.count ?? 0;
  const { limit } = state;
  if (limit === null || limit === undefined) return { ok: true, line: `${count} saved · unlimited on your plan` };
  return { ok: count < limit, line: `${count} of ${limit} saved` };
}

export const KIND_LABEL = { tone: "Track tone", fx: "Track FX", master: "Mastering", strip: "Channel strip" };
