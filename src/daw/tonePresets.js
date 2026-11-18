// Tone presets: a track's effect chain saved under a name ("My vocal") and put back on any track.
//
// The member's own presets live on the server (/api/economy/tonez/ — theirs on every device, and the
// tier's ceiling: Free 3, Premium 6, StatZ unlimited). The STARTERS here are built-in voice chains to
// begin from: free, not counted, and made only of the built-in effects, so nothing here can sound any
// different in the bounce than it does on the speakers.
import { cleanInserts, newInsert } from "./plugins.js";

const fx = (type, params, on = true) => ({ ...newInsert(type), on, params: { ...newInsert(type).params, ...params } });

export const STARTERS = [
  { key: "clean_vocal", name: "Clean vocal", what: "Rumble cut, a little presence and air, gentle compression, a short room.",
    chain: () => [fx("filter", { mode: 1, freq: 90, q: 0.7 }),
      fx("eq", { lowGain: -2, lowFreq: 200, midGain: 2, midFreq: 3000, midQ: 1, highGain: 3, highFreq: 10000 }),
      fx("comp", { threshold: -20, ratio: 3, attack: 5, release: 120, knee: 6, makeup: 4 }),
      fx("reverb", { decay: 1.2, predelay: 20, mix: 12 })] },
  { key: "rap_upfront", name: "Rap vocal, upfront", what: "Tight and in your face: firm compression, bite around 2.5 kHz, a short slap.",
    chain: () => [fx("filter", { mode: 1, freq: 100, q: 0.7 }),
      fx("eq", { lowGain: -3, lowFreq: 250, midGain: 3, midFreq: 2500, midQ: 1.2, highGain: 2, highFreq: 9000 }),
      fx("comp", { threshold: -24, ratio: 4, attack: 3, release: 80, knee: 4, makeup: 6 }),
      fx("delay", { time: 110, sync: 0, feedback: 10, mix: 8 })] },
  { key: "warm_rnb", name: "Warm R&B vocal", what: "Body in the lows, harshness tucked away, slow smooth compression, a big soft hall.",
    chain: () => [fx("filter", { mode: 1, freq: 70, q: 0.7 }),
      fx("eq", { lowGain: 2, lowFreq: 120, midGain: -2, midFreq: 3500, midQ: 1, highGain: 1.5, highFreq: 12000 }),
      fx("comp", { threshold: -18, ratio: 2.5, attack: 10, release: 200, knee: 10, makeup: 3 }),
      fx("reverb", { decay: 2.4, predelay: 30, mix: 22 })] },
  { key: "radio_voice", name: "Radio / phone voice", what: "Only the middle of the voice survives: the lows and highs are cut away.",
    chain: () => [fx("filter", { mode: 1, freq: 400, q: 0.9 }), fx("filter", { mode: 0, freq: 3200, q: 0.9 }),
      fx("eq", { lowGain: 0, lowFreq: 100, midGain: 6, midFreq: 1500, midQ: 1.5, highGain: 0, highFreq: 8000 }),
      fx("comp", { threshold: -20, ratio: 6, attack: 5, release: 100, knee: 3, makeup: 6 })] },
  { key: "adlibs_far", name: "Ad-libs, wide and far", what: "Thinned out and pushed back with an echo on the beat and a long tail, so the lead stays in front.",
    chain: () => [fx("filter", { mode: 1, freq: 150, q: 0.7 }),
      fx("eq", { lowGain: -2, lowFreq: 250, midGain: 0, midFreq: 1000, midQ: 1, highGain: 3, highFreq: 8000 }),
      fx("delay", { time: 375, sync: 0.75, feedback: 35, mix: 30 }),
      fx("reverb", { decay: 3, predelay: 40, mix: 35 })] },
];

/** A stored chain made into fresh inserts for a track: new ids, every value back in range. */
export function chainToInserts(chain) {
  return cleanInserts((Array.isArray(chain) ? chain : []).map((c) => ({ ...c, id: newInsert(c?.type)?.id })));
}

/** What gets saved: the effects, their on/off and their settings — not the ids, which belong to a track. */
export function insertsToChain(inserts) {
  return cleanInserts(inserts).map(({ type, on, params }) => ({ type, on, params }));
}

/** How the ceiling reads beside the save button. */
export function presetRoom(state) {
  if (!state) return { ok: true, line: "" };
  const { count = 0, limit } = state;
  if (limit === null || limit === undefined) return { ok: true, line: `${count} saved · unlimited on your plan` };
  return { ok: count < limit, line: `${count} of ${limit} saved` };
}
