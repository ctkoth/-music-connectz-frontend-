// Tone presets: a track's effect chain saved under a name ("My vocal") and put back on any track.
//
// The member's own presets live on the server (/api/economy/tonez/ — theirs on every device, and the
// tier's ceiling: Free 3, Premium 6, StatZ 12). The STARTERS here are built-in voice chains to
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

// Hook (chorus) vocals by RANGE: the same eight classes the coaches name. A hook sits bigger, brighter and wider
// than a verse, and the range decides where things go: a bass's weight and mud live lower than a soprano's, the
// presence that cuts through is higher the higher the voice, and so is the "s" the de-esser has to find. Four EQ
// bands (StatZ has no band ceiling), then compression, de-ess, warmth, a hall, width and a limiter.
// AUTOTUNE is not an insert: it renders a new take of the dry vocal (the Autotune panel). So it cannot be in a
// chain, and each chain says what to set there instead — run it FIRST on the dry take, then put the chain on.
const eqBands = (bands) => ({ ...newInsert("eq"), bands });
const RANGE_HOOKS = [
  ["bass", "Bass", 70, 220, 2500, 9000, 5000, "slow, 35 ms at 70%: a low voice glides, a fast snap sounds artificial down there"],
  ["baritone", "Baritone", 85, 240, 2800, 10000, 5500, "30 ms at 75%"],
  ["tenor", "Tenor", 100, 260, 3200, 10500, 6000, "25 ms at 80%"],
  ["countertenor", "Countertenor", 120, 280, 3600, 11000, 6800, "20 ms at 85%"],
  ["contralto", "Contralto", 110, 270, 3300, 11000, 6200, "25 ms at 80%"],
  ["alto", "Alto", 130, 300, 3800, 11500, 6800, "20 ms at 85%"],
  ["mezzo-soprano", "Mezzo-soprano", 140, 320, 4000, 12000, 7200, "20 ms at 85%"],
  ["soprano", "Soprano", 160, 350, 4500, 12500, 7800, "15 ms at 90%: high notes drift further, so it can be firmer"],
].map(([key, label, cut, mud, pres, air, ess, auto]) => ({
  group: "Hook vocals by range", statz: true, app: "singz", range: key, skills: [key.replace(/-/g, "_")], key: `hook_${key}`, name: `${label} hook, wide and bright`,
  what: `Rumble cut at ${cut} Hz, mud dipped near ${mud} Hz, presence at ${(pres / 1000).toFixed(1)} kHz, air above ${Math.round(air / 1000)} kHz, a de-esser at ${(ess / 1000).toFixed(1)} kHz, warmth, a hall, width and a limiter. `
    + `Autotune first, on the dry take: ${auto}. Autotune is a separate render in the Autotune panel, so it is not part of this chain.`,
  chain: () => [hp(cut),
    eqBands([{ type: "lowshelf", f: cut * 2, gain: 1.5, q: 1 }, { type: "peaking", f: mud, gain: -2.5, q: 1.2 }, { type: "peaking", f: pres, gain: 2.5, q: 1 }, { type: "highshelf", f: air, gain: 2.5, q: 1 }]),
    comp(-21, 3, 6, 120, 8, 4), fx("deess", { freq: ess, threshold: -30, ratio: 5 }), sat(3, 12500, 35),
    fx("proverb", { type: 2, decay: 2.0, predelay: 28, damp: 8000, width: 140, mix: 18 }), fx("widen", { width: 130 }), fx("limiter", { drive: 1, ceiling: -1, release: 90 })],
}));

// Rap chains by STYLE: the twelve RapZ styles, keyed by the SAME slugs the coach uses (`RAP_STYLES` in the backend's
// instruments.py; a test mirrors them), so a take scored as Drill can offer the Drill chain without a lookup table
// that could drift. Each is a different idea of a rap voice, not one chain with the numbers nudged:
//   [key, label, highpass, lowpass|null, body dB, presence Hz, presence dB, air dB, comp(threshold, ratio, attack, release),
//    saturation(drive, mix), de-ess threshold, echo(time, sync, feedback, mix)|null, reverb(type, decay, mix)|null, what]
const RAP_STYLE_CHAINS = [
  ["boom-bap", "Boom Bap", 100, null, 2, 3000, 1.5, 0, [-22, 4, 8, 100], [4, 40], -28, null, [0, 0.6, 6], "Warm and punchy: weight at 180 Hz, a little grit, firm 4:1 compression that lets the consonants hit, a short room."],
  ["trap", "Trap", 110, null, -1, 3500, 3, 3, [-24, 4, 3, 80], [3, 30], -26, [375, 0.5, 20, 10], [1, 1.2, 10], "Crisp and upfront: bright air, tight compression, a strong de-ess for the hi-hat range and a beat-synced echo."],
  ["drill", "Drill", 120, null, -2, 2200, 3, 0, [-26, 6, 2, 60], [5, 40], -26, null, [0, 0.5, 5], "Cold, dark and dry: low end thinned, mid bite at 2.2 kHz, hard compression, almost no space."],
  ["cloud-rap", "Cloud Rap", 130, 9500, 0, 2500, 0, -1, [-18, 2.5, 15, 200], [2, 25], -30, [375, 0.75, 35, 28], [2, 3.2, 40], "Washed and dreamy: highs rolled off, light compression, a long hall and a dotted-beat echo."],
  ["lyrical", "Lyrical", 100, null, 0, 3500, 3, 1, [-20, 3, 12, 140], [1, 20], -28, null, [0, 0.5, 4], "Clarity first: presence at 3.5 kHz so every word is heard, gentle slow compression, nearly dry."],
  ["storytelling", "Storytelling", 90, null, 1, 3000, 1.5, 1, [-18, 2, 20, 180], [2, 20], -30, null, [0, 0.7, 8], "Natural and close: 2:1 compression so the performance keeps its dynamics, warmth, a small room."],
  ["freestyle", "Freestyle", 100, null, 0, 3000, 2, 1, [-22, 3.5, 5, 100], [3, 30], -28, null, [0, 0.6, 6], "Raw and ready: moderate compression and a limiter safety net, little else, so nothing gets in the way of the take."],
  ["melodic", "Melodic", 90, null, 1.5, 3500, 2.5, 3, [-20, 3, 8, 130], [3, 30], -30, [375, 0.5, 28, 16], [1, 1.8, 15], "Smooth and warm for sung-rap: air on top, a plate, a beat-synced echo on the tails."],
  ["double-time", "Double-Time", 110, null, -1, 3200, 2.5, 1, [-24, 4, 1, 40], [2, 25], -26, null, [0, 0.4, 4], "Built for speed: very fast attack and release so the compressor keeps up with the syllables, a hard de-ess, nearly dry."],
  ["old-school", "Old School", 130, 12000, 1, 2000, 2, -2, [-20, 3.5, 10, 120], [5, 45], -28, [90, 0, 12, 12], [1, 0.9, 8], "Mid-forward and a little narrow like a record from then: tape-style grit, highs rolled off, a quick slap."],
  ["conscious", "Conscious", 90, null, 1.5, 3000, 1.5, 1, [-18, 2.5, 18, 170], [2, 20], -30, null, [1, 1.0, 10], "Intimate and warm, so the words land: light compression, a close plate, nothing flashy."],
  ["mumble", "Mumble", 120, 8500, 1, 1800, 1, -2, [-26, 6, 2, 70], [7, 55], -24, [375, 0.5, 30, 24], [2, 2.6, 34], "Dark, heavy and saturated: tight compression, highs rolled off, a thick echo and hall that melt the words together."],
];

// One rap style, three jobs. The LEAD is the style's own voice. The DUBS are the doubles stacked behind it: compressed
// LESS (a gentler ratio, slower times) so they keep their life, thinned so they don't fight the lead, with no grit of their
// own, then chorused and pushed wide. The CHORUS (hook) is the lead made bigger: brighter, wider, more space and a limiter.
// Eight effects at most; when the full list is longer the grit goes first, then the echo, so a chain stays whole.
const PARTS = { lead: "lead", dub: "dubs", chorus: "chorus (hook)" };
const rapChain = ([key, label, cut, lpf, body, presF, presG, air, c, sa, ess, echo, rev, what], tags, part = "lead") => {
  const dub = part === "dub", hook = part === "chorus";
  const note = dub ? " As dubs: compressed less, thinned, chorused and wide, so they sit behind the lead."
    : hook ? " As the hook: brighter, wider, with more space and a limiter." : "";
  return {
    group: `Rap · ${label}`, statz: true, app: "rapz", part, key: `rap_${key.replace(/-/g, "_")}${dub ? "_dub" : hook ? "_chorus" : ""}`,
    name: `${label} — ${PARTS[part]}`, what: what + note, ...tags,
    chain: () => {
      const ins = [{ ...hp(dub ? cut + 60 : cut), _k: "hp" }];
      if (lpf) ins.push({ ...lp(lpf), _k: "lp" });
      const e = eq(dub ? body - 1 : body, 160, 0, presF, 1.1, air + (hook ? 1.5 : dub ? 1 : 0), 10000);
      e.bands[1] = { type: "peaking", f: presF, gain: presG + (hook ? 1 : dub ? -0.5 : 0), q: 1.1 };
      ins.push(e);
      const ratio = dub ? Math.max(2, c[1] * 0.5) : c[1];
      ins.push(comp(dub ? c[0] + 4 : c[0], ratio, dub ? c[2] * 1.5 : c[2], dub ? c[3] * 1.4 : c[3], 6, 4), fx("deess", { freq: 7000, threshold: ess, ratio: 5 }));
      if (!dub) ins.push({ ...sat(hook ? sa[0] - 1 : sa[0], 11000, sa[1]), _k: "sat" });
      if (dub) ins.push(fx("chorus", { rate: 0.5, depth: 4, mix: 32 }));
      if (echo && !dub) ins.push({ ...fx("prodelay", { time: echo[0], sync: echo[1], feedback: echo[2], lowcut: 300, highcut: 5000, mix: hook ? echo[3] + 6 : echo[3] }), _k: "echo" });
      const r = rev || [0, 0.8, 8];
      ins.push(fx("proverb", { type: hook ? 2 : dub ? 1 : r[0], decay: hook ? Math.max(1.8, r[1] * 1.6) : dub ? Math.max(1.2, r[1]) : r[1], predelay: 15, damp: 7500,
        width: hook ? 140 : dub ? 160 : 115, mix: hook ? Math.max(16, r[2] * 1.8) : dub ? Math.max(14, r[2] * 1.2) : r[2] }));
      if (dub || hook) ins.push(fx("widen", { width: dub ? 175 : 130 }));
      if (!dub) ins.push({ ...fx("limiter", { drive: 1, ceiling: -1, release: 80 }), _k: "lim" });
      for (const drop of ["sat", "echo"]) { if (ins.length <= 8) break; const at = ins.findIndex((x) => x._k === drop); if (at >= 0) ins.splice(at, 1); }
      if (ins.length > 8) { const at = ins.findIndex((x) => x._k === "lp"); if (at >= 0) ins.splice(at, 1); }
      return ins.map(({ _k, ...x }) => x);
    },
  };
};
const rapSet = (row, tags) => ["lead", "dub", "chorus"].map((part) => rapChain(row, tags, part));
// The skill tokens a coach style stands for (personaz.py: the skills a member can name), so a chain is found by the
// skill on a profile as well as by the style on a take. The styles with no skill of their own share `any_rapping`.
const SKILL_OF_STYLE = { "boom-bap": "boom_bap", trap: "trap", drill: "drill", "cloud-rap": "cloud_rap", conscious: "conscious_rap",
  mumble: "mumble_rap", "old-school": "old_school", freestyle: "freestyle" };
const RAP_STYLE_CHAINS_BUILT = RAP_STYLE_CHAINS.flatMap((r) => rapSet(r, { style: r[0], skills: [SKILL_OF_STYLE[r[0]] || "any_rapping"] }));

// Rap sub-genres a member can name as a SKILL that the coach has no style for. Each is its own idea of a voice.
const RAP_SKILL_CHAINS = [
  ["chopper", "Chopper", 110, null, -1, 3400, 2.5, 1, [-25, 4, 1, 35], [2, 25], -26, null, [0, 0.4, 4], "Tech-rap speed: the fastest compressor times so every syllable of a run gets its own attack, a hard de-ess, dry."],
  ["crunk", "Crunk", 140, null, 1, 2000, 3, 0, [-28, 8, 2, 60], [9, 70], -24, null, [0, 0.5, 5], "Shouted and dirty: heavy 8:1 compression, hard saturation, a chant that stays in your face."],
  ["emo-rap", "Emo Rap", 100, 10500, 1.5, 3000, 1.5, 0, [-19, 3, 10, 150], [4, 45], -29, [375, 0.5, 30, 20], [2, 2.4, 28], "Sad and close: dark highs, soft grit, a washed echo and hall so it feels like a voice in an empty room."],
  ["g-funk", "G-Funk", 110, null, 2, 2800, 2, 2, [-20, 3, 12, 140], [2, 25], -29, [90, 0, 14, 10], [1, 1.1, 12], "Smooth West Coast: warm lows, a silky top, gentle compression, a short slap and a plate."],
  ["gangsta-rap", "Gangsta Rap", 120, null, 1, 1800, 2.5, -1, [-24, 5, 4, 80], [5, 45], -27, null, [0, 0.5, 5], "Menacing and mid-heavy: weight and a hard 1.8 kHz push, firm compression, dry and close."],
  ["hardcore", "Hardcore Hip-Hop", 130, null, 0, 2400, 3, 0, [-27, 6, 2, 60], [6, 50], -25, null, [0, 0.4, 3], "Raw and aggressive: hard compression, grit, no space at all."],
  ["jazz-rap", "Jazz Rap", 90, null, 2, 3200, 1.5, 2, [-17, 2, 20, 180], [2, 20], -30, null, [1, 1.3, 12], "Loose and warm: 2:1 compression so the phrasing breathes, a soft plate, nothing hard."],
  ["snap", "Snap Rap", 140, null, -2, 3800, 3, 3, [-23, 4, 3, 70], [3, 30], -26, [375, 0.5, 15, 8], [1, 0.8, 8], "Light and clipped: thin lows, bright consonants and a quick beat-synced echo that doesn't smear."],
].flatMap((r) => rapSet(r, { skills: [r[0].replace(/-/g, "_")] }));

// Which coach (a SkillZ `app_key`) each instrument starter belongs to, so a scored take can offer its own chain.
const APP_OF = { acoustic_guitar: "guitarz", electric_clean: "guitarz", electric_gain: "guitarz", bass_guitar: "bassz", sub_808: "bassz",
  piano: "keyz", synth_pad: "keyz", kick: "drumz", snare: "drumz", hats_overheads: "drumz", drum_bus: "drumz", strings: "violinz",
  brass_winds: "saxz", mix_bus: "producez", parallel_room: "producez",
  clean_vocal: "singz", warm_rnb: "singz", radio_voice: "singz", rap_upfront: "rapz", adlibs_far: "rapz" };

// The instruments a member can name as a skill that had no chain: free, three EQ bands, written for how each one sounds.
//   [skill token, name, coach, highpass, body Hz, body dB, presence Hz, presence dB, air dB, compressor, reverb|null, what]
const INSTRUMENT_SKILL_STARTERS = [
  ["viola", "Viola, dark and sweet", "violinz", 90, 250, 1.5, 2500, 1, 1, [-22, 2.5, 25, 220, 10, 1], [1.8, 18], "Warm lows kept, a little rosin at 2.5 kHz, soft compression and a hall."],
  ["cello", "Cello, full", "violinz", 40, 120, 2, 2000, 1, 0, [-22, 2.5, 30, 250, 10, 1], [2.0, 18], "Body at 120 Hz, bow detail at 2 kHz, slow compression so the long notes sing."],
  ["harp", "Harp, shimmer", "keyz", 60, 200, 0, 3500, 1.5, 2.5, [-24, 2, 15, 200, 10, 0], [2.6, 24], "Plucks kept clear, a little sparkle on top, a big soft hall under it."],
  ["banjo", "Banjo, snap", "guitarz", 120, 250, -2, 3500, 2.5, 1.5, [-20, 4, 3, 80, 4, 3], null, "Boxiness out, pick attack up, fast compression to hold the roll level."],
  ["mandolin", "Mandolin, bright", "guitarz", 150, 300, -1.5, 4000, 2, 2, [-21, 3, 5, 100, 6, 2], [0.8, 10], "Thin lows out, shimmer and pick up, a tiny room."],
  ["ukulele", "Ukulele, warm", "guitarz", 120, 220, 1.5, 3000, 1, 1, [-21, 3, 10, 130, 8, 2], [0.9, 10], "A little low warmth, soft strum detail, even level."],
  ["accordion", "Accordion, reedy", "keyz", 90, 220, 0, 1500, 1.5, 0, [-21, 3, 15, 160, 8, 2], [1.1, 14], "Reed body kept, harshness left alone, even compression and a small room."],
  ["organ", "Organ, thick", "keyz", 50, 150, 1.5, 1200, 1, 0, [-18, 2, 40, 300, 12, 0], [1.9, 20], "Fat lows, a touch of mid push, barely compressed, a big room."],
  ["harpsichord", "Harpsichord, crisp", "keyz", 100, 300, -1, 4000, 2, 2, [-22, 2, 8, 100, 6, 0], [0.9, 12], "Boxiness dipped, pluck up top, a short room."],
  ["double_bass", "Double bass, woody", "bassz", 35, 90, 2, 800, 1.5, 0, [-22, 3.5, 20, 150, 6, 3], null, "Thump at 90 Hz and string noise at 800 Hz so notes read on small speakers."],
  ["electric_guitar", "Electric guitar, in the mix", "guitarz", 90, 180, 1, 3000, 1.5, 0, [-19, 2.5, 18, 150, 8, 1], [0.9, 10], "Weight at 180 Hz, bite at 3 kHz, even level and a small room."],
  ["digital_piano", "Digital piano, softened", "keyz", 70, 200, 0, 3500, -1, 1, [-21, 2, 25, 200, 10, 1], [1.4, 12], "A touch of the brittle top taken off, air kept, a real-room tail."],
  ["synthesizer", "Synth lead, upfront", "keyz", 100, 250, -1, 2500, 2, 1.5, [-19, 3, 8, 110, 6, 2], [1.0, 10], "Mud out, presence up so a lead stays above the pad."],
].map(([skill, name, app, cut, bodyF, bodyG, presF, presG, air, c, rev, what]) => ({
  group: "More instruments", key: `skill_${skill}`, name, app, skills: [skill], what,
  chain: () => {
    const e = eq(bodyG, bodyF, 0, presF, 1, air, 10000); e.bands[1] = { type: "peaking", f: presF, gain: presG, q: 1 };
    const ins = [hp(cut), e, comp(c[0], c[1], c[2], c[3], c[4], c[5])];
    if (rev) ins.push(fx("reverb", { decay: rev[0], predelay: 15, mix: rev[1] }));
    return ins;
  },
}));

// Voice-over and acting skills (Monologist, Stage actor, Screen actor, Improviser): speech, not song, so the de-esser
// does more and the compression does less, and none of it is a music-bus move. StatZ, because they use the de-esser.
const VOICEOVER_STARTERS = [
  { group: "Acting and voice-over", statz: true, key: "vo_narration", name: "Narration, intimate", skills: ["monologues", "screen_acting"],
    what: "A close, steady voice for long reading: rumble out, warmth at 150 Hz, presence for clarity, a firm de-ess and level compression, no room.",
    chain: () => [hp(80), eq(1.5, 150, 0, 3500, 1, 1.5, 11000), comp(-20, 3, 10, 150, 8, 3), fx("deess", { freq: 6500, threshold: -30, ratio: 6 }), fx("limiter", { drive: 1, ceiling: -1, release: 100 })] },
  { group: "Acting and voice-over", statz: true, key: "vo_stage", name: "Stage monologue, carrying", skills: ["stage_acting", "monologues"],
    what: "Projects: presence pushed so it reads from the back, light compression so the dynamic range of the performance survives, a hall for the space.",
    chain: () => [hp(90), eq(0, 180, 0, 3000, 1, 2, 10000), comp(-18, 2, 20, 200, 10, 2), fx("deess", { freq: 6500, threshold: -32, ratio: 4 }), fx("proverb", { type: 2, decay: 2.0, predelay: 25, damp: 7500, width: 110, mix: 14 })] },
  { group: "Acting and voice-over", statz: true, key: "vo_improv", name: "Improv and sketch, forgiving", skills: ["improv"],
    what: "For unplanned takes at uneven levels: faster, firmer compression to catch the surprises, a de-ess and a limiter so a shout doesn't spike.",
    chain: () => [hp(100), eq(0, 200, 0, 3200, 1, 1, 9000), comp(-24, 4, 4, 100, 5, 5), fx("deess", { freq: 6800, threshold: -28, ratio: 5 }), fx("limiter", { drive: 2, ceiling: -1, release: 60 })] },
];

// Skill tokens (personaz.py) the original starters answer to, for the ones not built from a skill table above.
const SKILLS_OF = { acoustic_guitar: ["acoustic_guitar"], electric_clean: ["electric_guitar"], electric_gain: ["electric_guitar"],
  bass_guitar: ["bass_guitar"], sub_808: ["beat_making", "drum_programming"], piano: ["acoustic_piano"], synth_pad: ["synthesizer", "sound_design"],
  kick: ["drums_bass"], snare: ["drums_snare"], hats_overheads: ["cymbals"], drum_bus: ["any_percussion", "drums_bongo"],
  strings: ["violin"], brass_winds: ["any_keyboard"], mix_bus: ["mixing", "compression"], parallel_room: ["reverb_fx"],
  clean_vocal: ["any_singing", "vocals", "singing"], warm_rnb: ["any_singing"], radio_voice: ["any_singing"],
  rap_upfront: ["rapping", "rap"], adlibs_far: ["rapping"] };

// String TECHNIQUES by instrument: how a string is played changes what the chain has to do. A bowed (arco) note is long and
// wants slow, gentle levelling and a hall; a plucked (pizzicato) note is a transient, so it wants a fast compressor to even the
// pluck, the pluck's own frequency lifted and a short room so the decay isn't smothered; staccato/spiccato is a bounced bow, short
// and bright, in a small room; tremolo is a shimmer of repeated short strokes that smears in a hot compressor, so it gets the
// gentlest settings and the longest tail. Each instrument has its own register, so the cut, body and presence move with it.
//   [skill token, name, coach, highpass, body Hz, presence Hz, string/noise Hz]
const STRING_INSTRUMENTS = [
  ["violin", "Violin", "violinz", 150, 300, 3500],
  ["viola", "Viola", "violinz", 100, 250, 2600],
  ["cello", "Cello", "violinz", 50, 120, 2000],
  ["double_bass", "Double bass", "bassz", 35, 90, 800],
];
const TECHNIQUES = {
  arco: { label: "arco (bowed)", what: "Long bowed notes: slow, gentle compression so the sustain stays natural, a little rosin presence and a hall.",
    cut: 1, body: 1.5, pres: 1, air: 1, comp: [-22, 2.5, 30, 250, 10, 1], room: [2.0, 18] },
  pizzicato: { label: "pizzicato (plucked)", what: "Plucked notes: a fast compressor evens out the pluck's attack, the pluck's own frequency is lifted, and a short room leaves the decay alone.",
    cut: 1.3, body: 1, pres: 3, air: 1, comp: [-20, 4, 2, 70, 3, 3], room: [0.7, 10] },
  staccato: { label: "staccato / spiccato", what: "Short bounced-bow notes: quick compression, a little brightness so each note starts clearly, a small room.",
    cut: 1.2, body: 0, pres: 1.8, air: 1.5, comp: [-21, 3, 4, 90, 4, 2], room: [0.9, 12] },
  tremolo: { label: "tremolo", what: "Fast repeated strokes: the gentlest compression, because a tight one makes the shimmer pump, and the longest tail.",
    cut: 1, body: 0, pres: 0.5, air: 2, comp: [-24, 2, 40, 300, 12, 1], room: [2.8, 26] },
};
const STRING_TECHNIQUE_STARTERS = STRING_INSTRUMENTS.flatMap(([skill, label, app, cut, bodyF, presF]) =>
  Object.entries(TECHNIQUES).map(([tk, t]) => ({
    group: `Strings · ${label}`, key: `str_${skill}_${tk}`, name: `${label}, ${t.label}`, app, skills: [skill], technique: tk,
    what: `${t.what} Tuned for the ${label.toLowerCase()}'s register (cut ${Math.round(cut * t.cut)} Hz, body ${bodyF} Hz, presence ${(presF / 1000).toFixed(1)} kHz).`,
    chain: () => {
      const e = eq(t.body, bodyF, 0, presF, 1, t.air, 10000); e.bands[1] = { type: "peaking", f: presF, gain: t.pres, q: 1 };
      return [hp(Math.round(cut * t.cut)), e, comp(...t.comp), fx("reverb", { decay: t.room[0], predelay: 12, mix: t.room[1] })];
    },
  })));

export const STARTERS = [...VOICE_STARTERS.map((s) => ({ group: "Voice", ...s })), ...INSTRUMENT_STARTERS, ...STATZ_STARTERS, ...RANGE_HOOKS, ...RAP_STYLE_CHAINS_BUILT, ...RAP_SKILL_CHAINS, ...INSTRUMENT_SKILL_STARTERS, ...STRING_TECHNIQUE_STARTERS, ...VOICEOVER_STARTERS]
  .map((s) => (s.app || !APP_OF[s.key] ? s : { ...s, app: APP_OF[s.key] }))
  .map((s) => (s.skills || !SKILLS_OF[s.key] ? s : { ...s, skills: SKILLS_OF[s.key] }));

/** The chains that belong with a scored take: its coach, and (if the take has one) its range or rap style. Most specific first. */
export function startersFor(app, { range, style } = {}) {
  const mine = STARTERS.filter((s) => s.app === app);
  const rank = (s) => (style && s.style === style) || (range && s.range === range) ? 0 : s.style || s.range ? 2 : 1;
  return mine.filter((s) => !(s.style || s.range) || rank(s) === 0).sort((x, y) => rank(x) - rank(y));
}

/** True when a chain holds a plugin-grade effect (the StatZ ones). */
export const chainNeedsStatz = (inserts) => (Array.isArray(inserts) ? inserts : []).some((i) => PLUGINS[i?.type]?.statz);

/** A stored chain made into fresh inserts for a track: new ids, every value back in range. */
export function chainToInserts(chain) {
  return cleanInserts((Array.isArray(chain) ? chain : []).map((c) => ({ ...c, id: newInsert(c?.type)?.id })));
}

/** What gets saved: the effects, their on/off and their settings — not the ids, which belong to a track. */
export function insertsToChain(inserts) {
  return cleanInserts(inserts).map(({ type, on, params, bands, amount }) => ({ type, on, params, ...(bands ? { bands } : {}), ...(amount != null ? { amount } : {}) }));
}

/** How one kind's ceiling reads beside its save button. Each kind (tone, fx, master) counts on its own. */
export function presetRoom(state, kind = "tone") {
  if (!state) return { ok: true, line: "" };
  const count = state.kinds?.[kind]?.count ?? 0;
  const { limit } = state;
  if (limit === null || limit === undefined) return { ok: true, line: `${count} saved · unlimited on your plan` };
  return { ok: count < limit, line: `${count} of ${limit} saved` };
}

export const KIND_LABEL = { tone: "Track tone", fx: "Track FX", master: "Mastering", strip: "Channel strip", vst: "Plugin", synth: "Synth patch" };

/** A plugin's own room: its saved states are counted per plugin (a member's compressor and EQ each get the tier's number). */
export function pluginRoom(state, uid) {
  if (!state) return { ok: true, count: 0, line: "" };
  const count = state.per_plugin?.[uid] ?? 0;
  const { limit } = state;
  if (limit === null || limit === undefined) return { ok: true, count, line: `${count} saved for this plugin · unlimited on your plan` };
  return { ok: count < limit, count, line: `${count} of ${limit} saved for this plugin` };
}
