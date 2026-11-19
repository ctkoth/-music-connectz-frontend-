import { useEffect, useRef, useState } from "react";
import { Lock, Pause, Play, Plus, SlidersHorizontal, Trash2, Wand2 } from "lucide-react";
import { goToSpot } from "../goto.js";
import { IN_SHELL } from "../standalone.js";
import { toAudioBuffer, run } from "../mastering/client.js";
import { GAIN_MIN, GAIN_MAX, ROLES, audible, panLabel, suggestMix, trackRoom } from "../mastering/multitrack.js";
import { COMP, EQ_MAX, FLAT, HP, SPEEDS, cleanStrip, stripIsFlat, stripKey, stripWords } from "../mastering/strip.js";
import EqBands from "./EqBands.jsx";
import { useTonePresets } from "../daw/TonePresets.jsx";
import { presetRoom } from "../daw/tonePresets.js";

// Mix ConnectZ's multitrack section: every track's gain and pan, mute and solo, heard live while
// they move, and "Suggest a balance", which measures the tracks and proposes a starting mix with a
// reason per track. Mixing runs on the device and costs nothing; the tier says how MANY tracks
// (the shared Free 3 / Premium 6 / StatZ unlimited count from /limits/), never whether.
//
// The live preview is a StereoPannerNode per track and the render uses that node's own law
// (multitrack.js), so what the member sets by ear is what gets mastered.

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const stereo = (ch) => (ch.length >= 2 ? [ch[0], ch[1]] : [ch[0], ch[0]]);
const dbToGain = (db) => Math.pow(10, db / 20);

// Each track's strip (EQ + compressor) rendered by strip.js in the worker — the same function the
// mix runs — so the preview plays that output rather than a Web Audio approximation of it. A strip
// moved re-renders that one track after a short pause; until it lands the previous sound keeps playing.
// The audio itself is part of the key: the song keeps the id "song" when a new file replaces it.
const audioIds = new WeakMap();
let audioSeq = 0;
const audioId = (ch) => { if (!audioIds.has(ch)) audioIds.set(ch, ++audioSeq); return audioIds.get(ch); };
const keyOf = (t) => { const k = stripKey(t.strip); return k ? `${audioId(t.channels)}:${k}` : ""; };

function useStripped(tracks, sampleRate) {
  const [done, setDone] = useState({});          // id -> { key, channels }
  const [pending, setPending] = useState({});    // id -> true while a render is out
  const want = tracks.map((t) => [t.id, keyOf(t)]);
  const sig = want.map(([id, k]) => `${id}:${k}`).join("|");
  useEffect(() => {
    const timers = [];
    for (const t of tracks) {
      const key = keyOf(t);
      if (!key || done[t.id]?.key === key) continue;
      timers.push(setTimeout(async () => {
        setPending((p) => ({ ...p, [t.id]: true }));
        try {
          const out = await run("strip", { channels: t.channels.map((c) => c.slice()), sampleRate: t.sampleRate || sampleRate, strip: t.strip });
          setDone((d) => ({ ...d, [t.id]: { key, channels: out.channels, maxGrDb: out.maxGrDb, avgGrDb: out.avgGrDb } }));
        } catch { /* the preview keeps the last sound; the mix itself runs the strip regardless */ }
        finally { setPending((p) => { const n = { ...p }; delete n[t.id]; return n; }); }
      }, 250));
    }
    return () => timers.forEach(clearTimeout);
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  // What each track sounds like right now: its rendered strip if current, else as loaded.
  const sources = tracks.map((t) => {
    const key = keyOf(t);
    const d = done[t.id];
    const raw = `${audioId(t.channels)}:`;
    if (key && d?.key === key) return { id: t.id, key, channels: d.channels, sampleRate: t.sampleRate || sampleRate, gr: d };
    // Still rendering: keep playing the last rendered version of THIS audio, else the track as loaded.
    if (key && d && d.key.startsWith(raw)) return { id: t.id, key: d.key, channels: d.channels, sampleRate: t.sampleRate || sampleRate };
    return { id: t.id, key: raw, channels: t.channels, sampleRate: t.sampleRate || sampleRate };
  });
  return { sources, pending, done };
}

function useLiveMix(tracks, sources, sampleRate) {
  const ref = useRef({ ctx: null, nodes: [], startAt: 0, offset: 0, bufs: new Map() });
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const total = tracks.length ? Math.max(...tracks.map((t) => t.channels[0].length / (t.sampleRate || sampleRate))) : 0;

  // One buffer per track: the current sound only. A four-minute stereo track is ~85 MB as a buffer,
  // so every strip setting a member tried must not stay in memory.
  const bufferFor = (src) => {
    const s = ref.current;
    const hit = s.bufs.get(src.id);
    if (hit && hit.key === src.key) return hit.buf;
    const buf = toAudioBuffer(s.ctx, stereo(src.channels), src.sampleRate);
    s.bufs.set(src.id, { key: src.key, buf });
    return buf;
  };
  const startSource = (node, src, when, offset) => {
    const s = ref.current;
    const buf = bufferFor(src);
    const b = s.ctx.createBufferSource(); b.buffer = buf;
    b.connect(node.gain);
    if (offset < buf.duration) b.start(when, offset);
    node.src = b; node.key = src.key;
  };
  const apply = () => {
    const s = ref.current;
    if (!s.ctx) return;
    const on = audible(tracks);
    const t0 = s.ctx.currentTime;
    s.nodes.forEach((n, i) => {
      if (!n || !tracks[i]) return;
      n.gain.gain.setTargetAtTime(on[i] ? dbToGain(Number(tracks[i].gainDb) || 0) : 0, t0, 0.02);
      n.pan.pan.setTargetAtTime(Number(tracks[i].pan) || 0, t0, 0.02);
      // A strip that finished rendering swaps in at the same moment of the song.
      if (sources[i] && n.key !== sources[i].key) {
        const old = n.src;
        startSource(n, sources[i], t0, s.offset + Math.max(0, t0 - s.startAt));
        try { old?.stop(); } catch { /* already stopped */ }
      }
    });
  };
  const stop = (keep = true) => {
    const s = ref.current;
    if (s.ctx && keep) s.offset = Math.min(total, s.offset + (s.ctx.currentTime - s.startAt));
    s.nodes.forEach((n) => { try { n?.src?.stop(); } catch { /* already stopped */ } });
    s.nodes = [];
    setPlaying(false);
  };
  const play = () => {
    const s = ref.current;
    if (!tracks.length) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!s.ctx) s.ctx = new Ctx({ sampleRate });
    if (s.offset >= total - 0.05) s.offset = 0;
    s.startAt = s.ctx.currentTime + 0.05;
    s.nodes = tracks.map((t, i) => {
      const gain = s.ctx.createGain(); gain.gain.value = 0;
      const pan = s.ctx.createStereoPanner();
      gain.connect(pan).connect(s.ctx.destination);
      const node = { gain, pan, src: null, key: null };
      startSource(node, sources[i], s.startAt, s.offset);
      return node;
    });
    setPlaying(true);
    apply();
  };
  useEffect(() => { apply(); }); // every render: a fader moved, a mute pressed, a strip rendered
  useEffect(() => {
    if (!playing) return undefined;
    const iv = setInterval(() => {
      const s = ref.current;
      const p = Math.min(total, s.offset + Math.max(0, s.ctx.currentTime - s.startAt));
      setPos(p);
      if (p >= total - 0.02) { stop(false); s.offset = 0; setPos(0); }
    }, 250);
    return () => clearInterval(iv);
  }, [playing, total]); // eslint-disable-line react-hooks/exhaustive-deps
  // A track added or removed rebuilds the graph on the next press.
  const ids = tracks.map((t) => t.id).join(",");
  useEffect(() => { if (playing) stop(true); }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { stop(false); ref.current.ctx?.close?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { playing, play, stop: () => stop(true), pos, total };
}

const Slider = ({ label, value, shown, min, max, step, onChange, reset, aria }) => (
  <label className="block min-w-0 text-[11px] text-white/60">
    <span className="flex justify-between"><span>{label}</span><span className="tabular-nums text-white/80">{shown}</span></span>
    <input type="range" className="w-full" min={min} max={max} step={step} value={value} aria-label={aria}
      onChange={(e) => onChange(Number(e.target.value))} onDoubleClick={() => onChange(reset)} />
  </label>
);
const sdb = (v) => `${v > 0 ? "+" : ""}${Number(v).toFixed(1)} dB`;
const fhz = (f) => (f >= 1000 ? `${(f / 1000).toFixed(1)} kHz` : `${Math.round(f)} Hz`);
// Frequency sliders move on a log scale (a slider's middle should be ~1 kHz, not 4 kHz).
const toLog = (f, lo, hi) => Math.log(f / lo) / Math.log(hi / lo);
const fromLog = (x, lo, hi) => Math.round(lo * Math.pow(hi / lo, x));

// A channel strip saved under a name ("My vocal strip") and put back on any track, in Mix ConnectZ on any
// device: /api/economy/tonez/ kind "strip", its own 3 / 6 / unlimited room beside tones, FX and masters.
// Applying one replaces this track's low cut, EQ and compressor; nothing is mastered until Master it.
function StripPresets({ strip, onApply, name }) {
  const { state, failed, save, remove } = useTonePresets();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  if (failed) return null;
  const mine = (state?.presets || []).filter((p) => p.kind === "strip");
  const room = presetRoom(state, "strip");
  const same = mine.find((p) => p.name.toLowerCase() === title.trim().toLowerCase());
  const doSave = async () => {
    setErr(""); setMsg("");
    try { const p = await save(title.trim(), cleanStrip(strip), same?.id, "strip"); setMsg(`Saved "${p.name}" — on every track, on every device.`); setSaving(false); setTitle(""); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="space-y-1 border-t border-white/10 pt-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-2">
        <select className="neon-input !w-auto !py-0.5 text-xs" data-nomemo="true" value="" disabled={!mine.length}
          aria-label={`Put a saved strip on ${name}`}
          onChange={(e) => { const p = mine.find((x) => String(x.id) === e.target.value); if (p) { onApply(cleanStrip(p.chain)); setMsg(`"${p.name}" is on ${name}.`); } }}>
          <option value="">{mine.length ? "Use a saved strip…" : "No saved strips yet"}</option>
          {mine.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {!saving && <button className="re-link" onClick={() => { setSaving(true); setMsg(""); setErr(""); }}>Save this strip</button>}
        <span className="text-white/55">{room.line}</span>
        <span className="text-emerald-300">free</span>
      </div>
      {saving && (
        <div className="flex flex-wrap items-center gap-2">
          <input className="neon-input !w-44 !py-0.5 text-xs" placeholder="Name, e.g. Vocal strip" maxLength={60} autoFocus value={title}
            aria-label="Strip preset name" onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) doSave(); if (e.key === "Escape") setSaving(false); }} />
          <button className="re-btn !w-auto px-2 text-xs" disabled={!title.trim() || (!same && !room.ok)} onClick={doSave}>{same ? "Update it" : "Save"}</button>
          <button className="re-link" onClick={() => setSaving(false)}>Cancel</button>
          {!same && !room.ok && state && <span className="text-mcz-gold">Your plan keeps {state.limit} strips — update or delete one, or Premium keeps {state.ladder?.premium ?? 6}, StatZ unlimited.</span>}
          {mine.map((p) => (
            <span key={p.id} className="flex items-center gap-1 rounded bg-white/5 px-1.5 text-white/70">
              <button title="Update this one" onClick={() => setTitle(p.name)}>{p.name}</button>
              <button aria-label={`Delete strip ${p.name}`} className="text-white/30 hover:text-mcz-ember"
                onClick={() => { if (window.confirm(`Delete your "${p.name}" strip?`)) remove(p.id).catch((e) => setErr(e.message)); }}><Trash2 size={10} /></button>
            </span>
          ))}
        </div>
      )}
      {msg && <p className="text-emerald-300">{msg}</p>}
      {err && <p className="text-mcz-ember">{err}</p>}
    </div>
  );
}

function StripPanel({ t, i, onChange, pending, gr, bandCap, nextBandCap }) {
  const s = cleanStrip(t.strip);
  const set = (patch) => onChange(i, { strip: { ...s, ...patch } });
  const setComp = (patch) => set({ comp: { ...s.comp, ...patch } });
  const name = t.name;
  return (
    <div className="space-y-2 rounded-md border border-white/10 p-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block min-w-0 text-[11px] text-white/60">
          <span className="flex justify-between"><span>High-pass (cut lows)</span>
            <span className="tabular-nums text-white/80">{s.hp ? fhz(s.hp) : "Off"}</span></span>
          <input type="range" className="w-full" min={0} max={1} step={0.01} aria-label={`${name} high-pass`}
            value={s.hp ? 0.05 + 0.95 * toLog(s.hp, HP.min, HP.max) : 0}
            onChange={(e) => { const x = Number(e.target.value); set({ hp: x < 0.05 ? 0 : fromLog((x - 0.05) / 0.95, HP.min, HP.max) }); }}
            onDoubleClick={() => set({ hp: 0 })} />
        </label>
      </div>
      <EqBands bands={s.bands} onChange={(bands) => set({ bands })} gainMax={EQ_MAX} cap={bandCap} nextCap={nextBandCap} name={name}
        note="The low cut above is a filter, not a band — it never counts." />
      <div className="space-y-1 border-t border-white/10 pt-2">
        <label className="flex items-center gap-2 text-[11px] text-white/70">
          <input type="checkbox" checked={s.comp.on} onChange={(e) => setComp({ on: e.target.checked })} aria-label={`${name} compressor`} />
          Compressor
          {s.comp.on && gr && <span className="text-white/60">· took off up to {gr.maxGrDb} dB ({gr.avgGrDb} dB on average)</span>}
          {s.comp.on && gr && gr.maxGrDb === 0 && <span className="text-mcz-gold">· never reached the threshold — lower it to hear it work</span>}
        </label>
        {s.comp.on && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Slider label="Threshold" value={s.comp.thresholdDb} shown={`${s.comp.thresholdDb < 0 ? "−" : ""}${Math.abs(s.comp.thresholdDb)} dB`} min={COMP.threshold.min} max={COMP.threshold.max} step={1}
              reset={FLAT.comp.thresholdDb} aria={`${name} threshold`} onChange={(v) => setComp({ thresholdDb: v })} />
            <Slider label="Ratio" value={s.comp.ratio} shown={`${s.comp.ratio}:1`} min={COMP.ratio.min} max={COMP.ratio.max} step={0.5}
              reset={FLAT.comp.ratio} aria={`${name} ratio`} onChange={(v) => setComp({ ratio: v })} />
            <Slider label="Make-up gain" value={s.comp.makeupDb} shown={sdb(s.comp.makeupDb)} min={COMP.makeup.min} max={COMP.makeup.max} step={0.5}
              reset={0} aria={`${name} make-up gain`} onChange={(v) => setComp({ makeupDb: v })} />
            <div className="text-[11px] text-white/60">
              <span>Speed</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(SPEEDS).map(([k, sp]) => (
                  <button key={k} className={`pill text-[11px] ${s.comp.speed === k ? "!bg-white/20" : ""}`} aria-pressed={s.comp.speed === k}
                    onClick={() => setComp({ speed: k })}>{sp.label}</button>
                ))}
              </div>
              <p className="mt-1 text-white/55">{SPEEDS[s.comp.speed].why}.</p>
            </div>
          </div>
        )}
      </div>
      <StripPresets strip={s} name={name} onApply={(strip) => onChange(i, { strip })} />
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {pending ? <span className="text-white/50">Updating what you hear…</span>
          : !stripIsFlat(s) ? <span className="text-white/60">{stripWords(s)}.</span> : <span className="text-white/55">Flat — the track as loaded.</span>}
        {!stripIsFlat(s) && <button className="re-link ml-auto" onClick={() => onChange(i, { strip: FLAT })}>Reset</button>}
      </div>
    </div>
  );
}

export default function TrackMixer({ tracks, sampleRate, onChange, onAdd, onRemove, onApply, cap, nextCap, bandCap, nextBandCap, busy }) {
  const input = useRef(null);
  const stripped = useStripped(tracks, sampleRate);
  const live = useLiveMix(tracks, stripped.sources, sampleRate);
  const [open, setOpen] = useState({});      // which tracks have their strip open
  const [why, setWhy] = useState(null);       // reasons from the last suggestion, by track id
  const [image, setImage] = useState(null);   // stereo report of the mix as set
  const [working, setWorking] = useState("");
  const [err, setErr] = useState("");
  const room = trackRoom(tracks.length, cap);

  const payload = () => tracks.map((t) => ({ channels: t.channels, sampleRate: t.sampleRate || sampleRate,
    gainDb: t.gainDb, pan: t.pan, mute: t.mute, solo: t.solo, name: t.name, strip: t.strip }));

  async function suggest() {
    setErr(""); setWorking("Measuring each track");
    try {
      const m = await run("measure", { tracks: tracks.map((t) => ({ channels: t.channels.map((c) => c.slice()), sampleRate: t.sampleRate || sampleRate })) });
      const out = suggestMix(tracks.map((t, i) => ({ role: t.role, m: m[i], name: t.name, strip: t.strip })));
      onApply(out.map((o, i) => ({ gainDb: o.gainDb, pan: o.pan, strip: { ...cleanStrip(tracks[i].strip), hp: o.hp } })));
      setWhy(Object.fromEntries(tracks.map((t, i) => [t.id, out[i].why])));
      setImage(null);
    } catch (e) { setErr(e.message); } finally { setWorking(""); }
  }
  async function check() {
    setErr(""); setWorking("Measuring the stereo image");
    try {
      setImage(await run("image", { tracks: payload().map((t) => ({ ...t, channels: t.channels.map((c) => c.slice()) })), sampleRate }));
    } catch (e) { setErr(e.message); } finally { setWorking(""); }
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 p-3" data-tour="mixz-tracks">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white/80">TrackZ — mix several tracks</h3>
        <span className="text-[11px] text-white/60">
          {cap === null ? `${tracks.length} tracks · unlimited on your plan` : cap !== undefined ? `${tracks.length} of ${cap} tracks` : `${tracks.length} tracks`}
        </span>
      </div>
      <p className="text-[11px] text-white/60">
        Add your stems — vocal, beat, bass, backing vocals — and set each one's level, place in the stereo field, EQ and
        compression. They are mixed on your device, then mastered as one. Free on every plan: nothing is uploaded and nothing
        is charged — your plan only sets how many tracks.
      </p>

      <div className="space-y-2">
        {tracks.map((t, i) => (
          <div key={t.id} className="space-y-1 rounded-md bg-white/5 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-full min-w-0 truncate text-xs font-semibold text-white sm:w-auto sm:flex-1">{t.name}{i === 0 && <span className="ml-1 font-normal text-white/55">(your song)</span>}</span>
              <select className="neon-input !w-auto min-w-0 flex-1 !py-1 text-xs sm:flex-none" aria-label={`What ${t.name} is`} data-nomemo="true" value={t.role}
                onChange={(e) => onChange(i, { role: e.target.value })}>
                {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </select>
              <button className={`re-btn !w-auto px-2 text-xs ${t.mute ? "!bg-mcz-ember/30" : ""}`} aria-pressed={!!t.mute} onClick={() => onChange(i, { mute: !t.mute })}>M</button>
              <button className={`re-btn !w-auto px-2 text-xs ${t.solo ? "!bg-mcz-gold/30" : ""}`} aria-pressed={!!t.solo} onClick={() => onChange(i, { solo: !t.solo })}>S</button>
              <button className={`re-btn !w-auto px-2 text-xs ${!stripIsFlat(t.strip) ? "!bg-emerald-400/20" : ""}`} aria-expanded={!!open[t.id]}
                aria-label={`EQ and compressor for ${t.name}`} onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}>
                <SlidersHorizontal size={13} /> EQ{!stripIsFlat(t.strip) ? " on" : ""}
              </button>
              {i > 0 && <button className="re-btn !w-auto px-2" aria-label={`Remove ${t.name}`} onClick={() => onRemove(i)}><Trash2 size={13} /></button>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block min-w-0 text-[11px] text-white/60">
                <span className="flex justify-between"><span>Gain</span>
                  <span className="tabular-nums text-white/80">{t.gainDb > 0 ? "+" : ""}{Number(t.gainDb).toFixed(1)} dB</span></span>
                <input type="range" className="w-full" min={GAIN_MIN} max={GAIN_MAX} step={0.5} value={t.gainDb}
                  aria-label={`${t.name} gain`} onChange={(e) => onChange(i, { gainDb: Number(e.target.value) })}
                  onDoubleClick={() => onChange(i, { gainDb: 0 })} />
              </label>
              <label className="block min-w-0 text-[11px] text-white/60">
                <span className="flex justify-between"><span>Pan</span>
                  <span className="tabular-nums text-white/80">{panLabel(Number(t.pan) || 0)}</span></span>
                <input type="range" className="w-full" min={-1} max={1} step={0.05} value={t.pan}
                  aria-label={`${t.name} pan`} aria-valuetext={panLabel(Number(t.pan) || 0)}
                  onChange={(e) => onChange(i, { pan: Number(e.target.value) })}
                  onDoubleClick={() => onChange(i, { pan: 0 })} />
              </label>
            </div>
            {open[t.id] && <StripPanel t={t} i={i} onChange={onChange} pending={!!stripped.pending[t.id]} bandCap={bandCap} nextBandCap={nextBandCap}
              gr={stripped.sources[i]?.gr || null} />}
            {why?.[t.id] && <p className="text-[11px] text-emerald-300/80">{why[t.id]}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {room.ok ? (
          <button className="re-btn !w-auto px-3" disabled={!!busy || !!working} onClick={() => input.current?.click()}>
            <Plus size={14} /> Add a track{room.left != null ? ` (${room.left} left)` : ""}
          </button>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-mcz-gold">
            <Lock size={12} /> {cap} tracks is your plan's limit{nextCap ? ` — Premium mixes ${nextCap}, StatZ unlimited` : " — StatZ mixes unlimited"}.
            {!IN_SHELL && <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>See plans</button>}
          </span>
        )}
        <input ref={input} type="file" multiple accept="audio/*,.wav,.flac,.mp3,.m4a,.ogg" className="hidden"
          onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ""; if (fs.length) onAdd(fs); }} />
        <button className="re-btn !w-auto px-3" disabled={!tracks.length} onClick={live.playing ? live.stop : live.play}>
          {live.playing ? <Pause size={14} /> : <Play size={14} />} {live.playing ? "Stop" : "Hear the mix"}
        </button>
        {live.total > 0 && <span className="text-[11px] tabular-nums text-white/60">{mmss(live.pos)} / {mmss(live.total)}</span>}
      </div>

      {tracks.length > 1 && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <button className="re-btn !w-auto px-3" disabled={!!working || !!busy} onClick={suggest}>
              <Wand2 size={14} /> Suggest a balance
            </button>
            <button className="re-btn !w-auto px-3" disabled={!!working || !!busy} onClick={check}>Check the stereo image</button>
            <span className="text-[11px] text-emerald-300">Free</span>
            {working && <span className="text-[11px] text-white/50">{working}…</span>}
          </div>
          <p className="text-[11px] text-white/55">
            The suggestion measures each track's loudness, tone and width and sets a starting point from what each one is —
            level, pan, and a low cut on parts that don't need lows — with the reason under every track. It is a starting point, not a verdict: move anything, by ear.
          </p>
        </div>
      )}

      {image && (
        <div className="space-y-1 rounded-md bg-white/5 p-2 text-[11px] text-white/70">
          <p>Correlation <b className="text-white">{image.correlation}</b> (+1 is mono, under 0 cancels on a phone) · low end <b className="text-white">{image.lowCorrelation}</b> (should stay near +1) · sides {image.widthDb == null ? "silent (mono)" : <b className="text-white">{image.widthDb} dB</b>} under the centre (about −10 is a typical stereo mix).</p>
          {image.notes.length ? image.notes.map((n) => <p key={n} className="text-mcz-gold">• {n}</p>) : <p className="text-emerald-300">Nothing to fix: the image is wide, the low end is centred and nothing cancels in mono.</p>}
        </div>
      )}
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}
