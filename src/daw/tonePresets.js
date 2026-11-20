// Tone presets: a track's effect chain saved under a name ("My vocal") and put back on any track.
//
// The member's own presets live on the server (/api/economy/tonez/ — theirs on every device, and the
// tier's ceiling: Free 3, Premium 6, StatZ unlimited). The STARTERS here are built-in voice chains to
// begin from: free, not counted, and made only of the built-in effects, so nothing here can sound any
// different in the bounce than it does on the speakers.
import { PLUGINS, cleanInserts, newInsert } from "./plugins.js";

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

// StatZ's: whole chains built from the plugin-grade effects (de-esser, saturation, glue, limiter, pro reverb and
// delay, widener). They are marked `statz` and the picker refuses them without the plan or the daily sample, the
// same gate as adding one of those effects by hand. Max eight effects a track, and every one fits it.
const sat = (drive, tone, mix) => fx("saturate", { drive, tone, mix });
export const STATZ_STARTERS = [
  { group: "StatZ chains", statz: true, key: "pro_lead_vocal", name: "Pro lead vocal", what: "Rumble cut, a little presence, even compression, the \"s\" sounds tamed, a touch of warmth, a plate and a safety limiter so a loud take never clips.",
    chain: () => [hp(90), eq(-2, 200, 2, 3200, 1, 2.5, 11000), comp(-20, 3, 5, 120, 6, 4), fx("deess", { freq: 6500, threshold: -30, ratio: 5 }),
      sat(3, 12000, 40), fx("proverb", { type: 1, decay: 1.6, predelay: 25, damp: 8000, width: 120, mix: 14 }), fx("limiter", { drive: 1, ceiling: -1, release: 80 })] },
  { group: "StatZ chains", statz: true, key: "pro_rap_vocal", name: "Pro rap vocal", what: "Tight and forward: firm compression, bite at 2.5 kHz, de-essed, a slap echo that bounces side to side and a limiter at the end.",
    chain: () => [hp(100), eq(-3, 250, 3, 2500, 1.2, 2, 9000), comp(-24, 4, 3, 80, 4, 6), fx("deess", { freq: 7000, threshold: -28, ratio: 6 }),
      sat(4, 11000, 35), fx("prodelay", { time: 220, sync: 0, feedback: 18, lowcut: 300, highcut: 5000, mix: 10 }), fx("limiter", { drive: 2, ceiling: -1, release: 60 })] },
  { group: "StatZ chains", statz: true, key: "pro_rap_lead_hard", name: "Pro rap lead, hard", what: "Aggressive and upfront: heavy compression, grit from saturation, a sharp de-ess, nearly dry so every word hits.",
    chain: () => [hp(110), eq(-3, 250, 3.5, 3000, 1.2, 2, 10000), comp(-26, 6, 2, 60, 3, 8), fx("deess", { freq: 7500, threshold: -26, ratio: 8 }),
      sat(7, 10000, 55), fx("proverb", { type: 0, decay: 0.6, predelay: 5, damp: 9000, width: 100, mix: 6 }), fx("limiter", { drive: 3, ceiling: -1, release: 50 })] },
  { group: "StatZ chains", statz: true, key: "pro_melodic_rap", name: "Pro melodic rap", what: "Smooth and warm for sung-rap: softer compression, air on top, a plate and a beat-synced echo on the tails.",
    chain: () => [hp(90), eq(1.5, 150, -1.5, 3500, 1, 3, 12000), comp(-20, 3, 8, 130, 8, 4), fx("deess", { freq: 6500, threshold: -30, ratio: 5 }),
      sat(3, 13000, 30), fx("prodelay", { time: 375, sync: 0.5, feedback: 28, lowcut: 250, highcut: 5500, mix: 16 }), fx("proverb", { type: 1, decay: 1.8, predelay: 25, damp: 7500, width: 125, mix: 15 })] },
  { group: "StatZ chains", statz: true, key: "pro_adlibs", name: "Pro ad-libs, far and wide", what: "Thinned, crushed a little, pushed back with a ping-pong echo and a big tail so the lead stays in front.",
    chain: () => [hp(180), lp(11000), eq(-2, 300, 1, 2000, 1, 2, 9000), comp(-24, 4, 4, 90, 5, 5), fx("deess", { freq: 7000, threshold: -30, ratio: 5 }),
      fx("prodelay", { time: 375, sync: 0.75, feedback: 38, lowcut: 350, highcut: 4500, mix: 30 }), fx("proverb", { type: 2, decay: 3.2, predelay: 40, damp: 6000, width: 170, mix: 35 }), fx("widen", { width: 160 })] },
  { group: "StatZ chains", statz: true, key: "pro_sung_lead", name: "Pro sung lead, polished", what: "Natural, open compression, presence and air, a de-esser set for singing, a hall and a limiter as a safety net.",
    chain: () => [hp(80), eq(0, 180, 1.5, 4000, 0.9, 3, 12000), comp(-18, 2.5, 12, 160, 10, 3), fx("deess", { freq: 6000, threshold: -32, ratio: 4 }),
      sat(2, 14000, 25), fx("proverb", { type: 2, decay: 2.2, predelay: 30, damp: 8000, width: 130, mix: 18 }), fx("limiter", { drive: 1, ceiling: -1, release: 100 })] },
  { group: "StatZ chains", statz: true, key: "pro_vocal_dubs", name: "Pro vocal dubs, light and wide", what: "Compressed less than the lead (2:1, slow) so the dubs keep their life, then spread wide with a short stereo chorus and the widener, so they frame the lead without covering it.",
    chain: () => [hp(150), eq(-1.5, 250, 0, 1200, 1, 2.5, 10000), comp(-18, 2, 20, 180, 12, 2), fx("deess", { freq: 6500, threshold: -30, ratio: 4 }),
      fx("chorus", { rate: 0.5, depth: 5, mix: 40 }), fx("proverb", { type: 1, decay: 1.4, predelay: 20, damp: 7000, width: 170, mix: 16 }), fx("widen", { width: 175 })] },
  { group: "StatZ chains", statz: true, key: "pro_backing_vocals", name: "Pro backing vocals, wide", what: "Thinned out, doubled and spread wide so they sit around the lead and not on top of it.",
    chain: () => [hp(160), eq(-2, 250, 0, 1000, 1, 2, 9000), comp(-22, 3, 8, 140, 6, 3), fx("deess", { freq: 6500, threshold: -30, ratio: 4 }),
      fx("chorus", { rate: 0.6, depth: 4, mix: 35 }), fx("proverb", { type: 2, decay: 2.4, predelay: 35, damp: 6500, width: 160, mix: 28 }), fx("widen", { width: 150 })] },
  { group: "StatZ chains", statz: true, key: "pro_mix_bus", name: "Pro mix bus, glue and limit", what: "Gentle bus glue with the dry mix underneath, a little width, then a limiter that holds the ceiling. Loudness is still set in Mix ConnectZ.",
    chain: () => [eq(1, 70, 0, 1000, 1, 1.2, 10000), fx("glue", { threshold: -16, ratio: 2, attack: 30, release: 200, makeup: 1.5, mix: 60 }), fx("widen", { width: 110 }), fx("limiter", { drive: 2, ceiling: -1, release: 100 })] },
];

export const STARTERS = [...VOICE_STARTERS.map((s) => ({ group: "Voice", ...s })), ...INSTRUMENT_STARTERS, ...STATZ_STARTERS];

/** True when a chain holds a plugin-grade effect (the StatZ ones). */
export const chainNeedsStatz = (inserts) => (Array.isArray(inserts) ? inserts : []).some((i) => PLUGINS[i?.type]?.statz);

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
