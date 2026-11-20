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

export const VOICE_STARTERS = [
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

// Starters for the rest of the kit: each is a sensible first move for that sound, written here from ordinary
// mixing practice with the built-in effects only (free, three EQ bands, nothing StatZ). They are starting
// points, not verdicts — every one says what it does so a member can tell whether it fits their take. Any
// value outside an effect's range is clamped when applied, and the test holds every one inside it.
const hp = (freq, q = 0.7) => fx("filter", { mode: 1, freq, q });
const lp = (freq, q = 0.7) => fx("filter", { mode: 0, freq, q });
const comp = (threshold, ratio, attack, release, knee, makeup) => fx("comp", { threshold, ratio, attack, release, knee, makeup });
export const INSTRUMENT_STARTERS = [
  { group: "Guitar", key: "acoustic_guitar", name: "Acoustic guitar, open", what: "Rumble cut, boxiness dipped around 250 Hz, a little pick and air, gentle levelling.",
    chain: () => [hp(80), eq(0, 120, -2, 250, 1.2, 2.5, 9000), comp(-20, 2.5, 15, 150, 8, 2)] },
  { group: "Guitar", key: "electric_clean", name: "Electric guitar, clean", what: "Low end tidied, body at 200 Hz, a touch of bite and a short room.",
    chain: () => [hp(90), eq(0, 150, 1.5, 3000, 1, 1.5, 8000), comp(-18, 2, 20, 160, 8, 1), fx("reverb", { decay: 1.0, predelay: 15, mix: 10 })] },
  { group: "Guitar", key: "electric_gain", name: "Electric guitar, driven", what: "Mud under 100 Hz removed and the fizz above 8 kHz rolled off so a distorted tone sits behind a vocal.",
    chain: () => [hp(100), lp(8500), eq(0, 200, -1.5, 3500, 1.2, 0, 8000)] },
  { group: "Bass", key: "bass_guitar", name: "Bass guitar, solid", what: "Sub rumble out, weight at 80 Hz, definition at 800 Hz, firm even compression.",
    chain: () => [hp(35), eq(2, 80, -1, 300, 1, 2, 900), comp(-22, 4, 20, 120, 4, 4)] },
  { group: "Bass", key: "sub_808", name: "808 / sub bass", what: "Keeps the weight and cuts what fights the kick; barely compressed so the note rings.",
    chain: () => [hp(28), lp(5000), eq(1.5, 55, -2, 250, 1, 0, 3000), comp(-14, 2, 30, 200, 6, 1)] },
  { group: "Keys", key: "piano", name: "Piano, natural", what: "Low mud cleared, a little sparkle, a medium room so it sounds played in a space.",
    chain: () => [hp(60), eq(0, 150, -1.5, 400, 1, 2, 10000), comp(-20, 2, 25, 200, 10, 1), fx("reverb", { decay: 1.6, predelay: 20, mix: 14 })] },
  { group: "Keys", key: "synth_pad", name: "Synth pad, wide", what: "Lows cleared so a pad does not eat the bass, highs softened, a long soft tail.",
    chain: () => [hp(150), lp(10000), eq(0, 200, -2, 500, 1, 0, 8000), fx("reverb", { decay: 3.0, predelay: 30, mix: 25 })] },
  { group: "Drums", key: "kick", name: "Kick, punch", what: "Below 30 Hz removed, thump at 60 Hz, box dipped at 350 Hz, click at 4 kHz, fast compression.",
    chain: () => [hp(30), eq(2.5, 60, -3, 350, 1.4, 2, 4000), comp(-18, 4, 10, 80, 3, 3)] },
  { group: "Drums", key: "snare", name: "Snare, crack", what: "Body at 200 Hz, ring dipped at 500 Hz, crack at 5 kHz, quick and tight with a short room.",
    chain: () => [hp(80), eq(1.5, 200, -2, 500, 2, 2, 6000), comp(-20, 4, 5, 90, 3, 3), fx("reverb", { decay: 0.7, predelay: 10, mix: 10 })] },
  { group: "Drums", key: "hats_overheads", name: "Hats and overheads, airy", what: "Everything under 300 Hz removed so cymbals stay out of the way; a little shimmer on top.",
    chain: () => [hp(300), eq(-1, 400, 0, 2000, 1, 2.5, 10000), comp(-22, 2, 20, 150, 8, 1)] },
  { group: "Drums", key: "drum_bus", name: "Drum bus, glue", what: "Slow-attack compression that lets the hits through and holds the sustain together.",
    chain: () => [eq(1, 80, 0, 1000, 1, 1.5, 9000), comp(-16, 3, 30, 120, 6, 3)] },
  { group: "Strings and brass", key: "strings", name: "Strings, smooth", what: "Low rumble cleared, harshness at 3 kHz softened, a roomy hall.",
    chain: () => [hp(60), eq(0, 150, -1.5, 3000, 1, 1, 9000), comp(-22, 2, 30, 250, 10, 1), fx("reverb", { decay: 2.2, predelay: 25, mix: 18 })] },
  { group: "Strings and brass", key: "brass_winds", name: "Brass and winds, present", what: "Cleaner low end and a lift where the instrument speaks, with even level.",
    chain: () => [hp(100), eq(0, 200, -1.5, 1500, 1, 1.5, 8000), comp(-20, 3, 15, 150, 6, 2)] },
  { group: "Mix", key: "mix_bus", name: "Mix bus, gentle", what: "Gentle two-to-one on the whole mix with a hint of low end and air. Leave the loudness to the master.",
    chain: () => [hp(25), eq(1, 70, 0, 1000, 1, 1, 10000), comp(-14, 2, 30, 150, 10, 1.5)] },
  { group: "Mix", key: "parallel_room", name: "Parallel room send", what: "A short bright room to put under a dry track so it feels placed without getting washed out.",
    chain: () => [hp(250), fx("reverb", { decay: 0.9, predelay: 8, mix: 100 })] },
];

export const STARTERS = [...VOICE_STARTERS.map((s) => ({ group: "Voice", ...s })), ...INSTRUMENT_STARTERS];

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

export const KIND_LABEL = { tone: "Track tone", fx: "Track FX", master: "Mastering", strip: "Channel strip", vst: "Plugin" };

/** A plugin's own room: its saved states are counted per plugin (a member's compressor and EQ each get the tier's number). */
export function pluginRoom(state, uid) {
  if (!state) return { ok: true, count: 0, line: "" };
  const count = state.per_plugin?.[uid] ?? 0;
  const { limit } = state;
  if (limit === null || limit === undefined) return { ok: true, count, line: `${count} saved for this plugin · unlimited on your plan` };
  return { ok: count < limit, count, line: `${count} of ${limit} saved for this plugin` };
}
