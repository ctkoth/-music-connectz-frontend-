import test from "node:test";
import assert from "node:assert/strict";
import { STARTERS, startersFor, chainToInserts, insertsToChain, presetRoom } from "./tonePresets.js";
import { PLUGINS, cleanInserts } from "./plugins.js";

test("every starter is made of built-in effects with every value inside its range", () => {
  for (const s of STARTERS) {
    const chain = s.chain();
    assert.ok(chain.length > 0 && chain.length <= 8, s.name);
    assert.deepEqual(cleanInserts(chain).map((i) => [i.params, i.bands]), chain.map((i) => [i.params, i.bands]), `${s.name} has a value out of range`);
    for (const i of chain) if (i.type === "eq" && !s.statz) assert.equal(i.bands.length, 3, `${s.name}: a free starter fits the Free plan's three bands`);
    for (const i of chain) assert.ok(PLUGINS[i.type]);
    assert.ok(s.what.length > 10);
  }
});

test("a saved chain loses its ids and comes back with fresh ones, settings intact", () => {
  const ins = STARTERS[0].chain();
  const saved = insertsToChain(ins);
  assert.ok(saved.every((c) => !("id" in c)));
  const back = chainToInserts(saved);
  assert.deepEqual(back.map((i) => [i.params, i.bands]), ins.map((i) => [i.params, i.bands]));
  assert.ok(back.every((i, k) => i.id && i.id !== ins[k].id));
});

test("a stored value out of range is pulled back in, and junk is dropped", () => {
  const back = chainToInserts([{ type: "comp", params: { ratio: 99 } }, { type: "bogus" }]);
  assert.equal(back.length, 1);
  assert.equal(back[0].params.ratio, 20);
});

test("each kind's ceiling reads on its own, in a unit you can check", () => {
  const st = { limit: 3, kinds: { tone: { count: 3 }, fx: { count: 1 } } };
  assert.deepEqual(presetRoom(st, "fx"), { ok: true, line: "1 of 3 saved" });
  assert.equal(presetRoom(st, "tone").ok, false);
  assert.deepEqual(presetRoom(st, "master"), { ok: true, line: "0 of 3 saved" });
  assert.equal(presetRoom({ limit: null, kinds: { tone: { count: 40 } } }, "tone").ok, true);
});

test("an EQ saved before bands opens as the three bands it was, and a chain keeps every band", () => {
  const [old] = cleanInserts([{ type: "eq", params: { lowGain: -2, lowFreq: 200, midGain: 2, midFreq: 3000, midQ: 1.5, highGain: 3, highFreq: 10000 } }]);
  assert.deepEqual(old.bands, [{ type: "lowshelf", f: 200, gain: -2, q: 1 }, { type: "peaking", f: 3000, gain: 2, q: 1.5 }, { type: "highshelf", f: 10000, gain: 3, q: 1 }]);
  const seven = Array.from({ length: 7 }, (_, k) => ({ type: "peaking", f: 200 * (k + 1), gain: -1, q: 2 }));
  const back = chainToInserts(insertsToChain(cleanInserts([{ type: "eq", bands: seven }])));
  assert.equal(back[0].bands.length, 7);
});

test("starters have unique keys, cover the whole kit, and borrow nobody's preset names", () => {
  const keys = STARTERS.map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length);
  const groups = new Set(STARTERS.map((s) => s.group));
  for (const g of ["Voice", "Guitar", "Bass", "Keys", "Drums", "Strings and brass", "Mix"]) assert.ok(groups.has(g), g);
  // Ours are written from ordinary practice; a name that implies a vendor's preset would imply a link we do not have.
  for (const s of STARTERS) assert.ok(!/fabfilter|ozone|izotope|waves|pro-?q|pro-?c|pro tools|logic|bitwig/i.test(`${s.name} ${s.what}`), s.name);
});

test("a starter uses a StatZ effect only if it says so, so the picker can lock it", () => {
  for (const s of STARTERS) {
    const pro = s.chain().some((i) => PLUGINS[i.type].statz);
    assert.equal(!!s.statz, pro, `${s.name}: statz flag must match what it contains`);
  }
  assert.ok(STARTERS.filter((s) => s.statz).length >= 4);
});

test("there is a hook-vocal chain for every vocal range, ordered so the cut and the sibilance climb with the voice", () => {
  const hooks = STARTERS.filter((s) => s.group === "Hook vocals by range");
  assert.equal(hooks.length, 8);
  const cut = (s) => s.chain()[0].params.freq;
  const bass = hooks.find((s) => s.key === "hook_bass"), soprano = hooks.find((s) => s.key === "hook_soprano");
  assert.ok(cut(bass) < cut(soprano));
  const ess = (s) => s.chain().find((i) => i.type === "deess").params.freq;
  assert.ok(ess(bass) < ess(soprano));
  for (const h of hooks) assert.match(h.what, /Autotune/);
  for (const h of hooks) assert.ok(h.chain().length <= 8);
});

// The coaches' own lists (backend apps/economy/instruments.py: VOCAL_RANGES, RAP_STYLES, INSTRUMENT_APP_KEYS). Mirrored here
// the way funnelkinds.test.mjs mirrors the funnel's: the two repos deploy apart, and a chain keyed to a slug the coach
// never sends is a preset nothing will ever offer.
const SERVER_RANGES = ["bass", "baritone", "tenor", "countertenor", "contralto", "alto", "mezzo-soprano", "soprano"];
const SERVER_STYLES = ["boom-bap", "trap", "drill", "cloud-rap", "lyrical", "storytelling", "freestyle", "melodic", "double-time", "old-school", "conscious", "mumble"];
const SERVER_APPS = ["singz", "rapz", "guitarz", "bassz", "keyz", "drumz", "violinz", "flutez", "saxz", "clarinetz", "trumpetz", "producez"];

test("chains are keyed to the coaches' own lists: every range and every rap style has one, and nothing else is invented", () => {
  const ranges = STARTERS.filter((s) => s.range).map((s) => s.range).sort();
  assert.deepEqual([...new Set(ranges)], [...SERVER_RANGES].sort());
  const styles = [...new Set(STARTERS.filter((s) => s.style).map((s) => s.style))].sort();
  assert.deepEqual(styles, [...SERVER_STYLES].sort());
  for (const s of STARTERS) if (s.app) assert.ok(SERVER_APPS.includes(s.app), `${s.name}: ${s.app} is not a coach`);
  for (const s of STARTERS) assert.ok(s.chain().length <= 8, `${s.name} has more than eight effects`);
});

test("a scored take is offered its own range or style chain first, and other styles' chains never", () => {
  const drill = startersFor("rapz", { style: "drill" });
  assert.equal(drill[0].style, "drill");
  assert.ok(drill.every((s) => !s.style || s.style === "drill"));
  const bass = startersFor("singz", { range: "bass" });
  assert.equal(bass[0].range, "bass");
  assert.ok(startersFor("drumz").length >= 4);
});

test("every rap style, and every rap sub-genre a member can name as a skill, has a lead, dubs and a chorus chain", () => {
  const rap = STARTERS.filter((s) => s.app === "rapz" && s.part);
  const by = new Map();
  for (const s of rap) { const k = s.style || s.skills[0]; by.set(k, [...(by.get(k) || []), s.part]); }
  for (const st of SERVER_STYLES) assert.deepEqual((by.get(st) || []).sort(), ["chorus", "dub", "lead"], st);
  for (const sk of ["chopper", "crunk", "emo_rap", "g_funk", "gangsta_rap", "hardcore", "jazz_rap", "snap"]) assert.deepEqual((by.get(sk) || []).sort(), ["chorus", "dub", "lead"], sk);
  // dubs compress less than their lead; the chorus is wider than its lead
  for (const st of SERVER_STYLES) {
    const get = (part) => rap.find((s) => s.style === st && s.part === part).chain();
    const ratio = (c) => c.find((i) => i.type === "comp").params.ratio;
    assert.ok(ratio(get("dub")) < ratio(get("lead")) || ratio(get("dub")) <= 2, `${st}: dubs compress less`);
    assert.ok(get("dub").some((i) => i.type === "widen"), `${st}: dubs are wide`);
    assert.ok(get("chorus").some((i) => i.type === "limiter" || i.type === "widen"), st);
  }
});

// The skills a member can name (personaz.py _ARTIST and the acting/mix roles): the audit. A skill with a recording sound
// but no chain is a profile that names something the DAW cannot help with.
const AUDIO_SKILLS = ["boom_bap", "trap", "drill", "cloud_rap", "conscious_rap", "mumble_rap", "old_school", "freestyle", "chopper", "crunk",
  "emo_rap", "g_funk", "gangsta_rap", "hardcore", "jazz_rap", "snap", "any_rapping", "any_singing", "bass", "baritone", "tenor", "countertenor",
  "contralto", "alto", "mezzo_soprano", "soprano", "acoustic_guitar", "electric_guitar", "bass_guitar", "double_bass", "acoustic_piano",
  "digital_piano", "synthesizer", "organ", "harpsichord", "accordion", "drums_snare", "drums_bass", "cymbals", "violin", "viola", "cello", "harp",
  "banjo", "mandolin", "ukulele", "monologues", "stage_acting", "screen_acting", "improv", "mixing", "reverb_fx"];
test("every audio skill a member can name has at least one chain", () => {
  const have = new Set(STARTERS.flatMap((s) => s.skills || []));
  const missing = AUDIO_SKILLS.filter((k) => !have.has(k));
  assert.deepEqual(missing, []);
});
