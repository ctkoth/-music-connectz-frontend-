import Doors from "../components/Doors.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Lock, Pause, Play, Save, Trash2, Upload, Wand2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { onHandoff } from "../handoff.js";
import { IconImg } from "../App.jsx";
import { IN_SHELL } from "../standalone.js";
import { STYLES, INTENSITY, TARGETS, DEFAULTS, GLUE_DB_MAX, CUSTOM_LUFS, PUNCH_MAX, BANDS_SPLIT, cleanSettings } from "../mastering/master.js";
import { EXPORT_RATES } from "../mastering/resample.js";
import { MP3_KBPS, MP3_DEFAULT_KBPS, mp3Mb } from "../mastering/mp3.js";
import { dbToGain } from "../mastering/dsp.js";
import { decodeFile, run, toAudioBuffer, saveBlob, slug, MAX_SECONDS } from "../mastering/client.js";

// Mix ConnectZ — mastering that runs on the member's own device.
//
// Every number on this screen is measured by src/mastering/ (BS.1770-4
// loudness, true peak, EBU Tech 3342 loudness range), and every move the
// master makes is listed with the measurement that caused it. Nothing here is
// estimated, and nothing is uploaded unless the member presses Save.
//
// What the SERVER decides: how much compression this member's tier may use
// (GET /api/economy/mixz/ — a tier says how much, never whether), and where a
// saved master lives. What it does not: the mastering itself, which costs the
// platform nothing and is therefore free at every tier.

const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const fmt = (v, unit = "", digits = 1) => (Number.isFinite(v) ? `${v.toFixed(digits)}${unit}` : "—");
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const TIER_NAME = { free: "Free", premium: "Premium", statz: "StatZ" };

// What each number means, said beside it — a number with no description is a
// number with no meaning.
const MEASURES = [
  { key: "lufs", label: "Loudness", unit: " LUFS", why: "Integrated loudness — what streaming services normalise to." },
  { key: "truePeakDb", label: "True peak", unit: " dBTP", why: "The highest point of the rebuilt waveform, between the samples. Over −1 risks distortion once it is encoded." },
  { key: "lra", label: "Loudness range", unit: " LU", why: "How much the loud and quiet sections differ. Low means steady; high means dynamic." },
  { key: "plr", label: "Peak to loudness", unit: " dB", why: "Room the peaks stand above the average. Under about 8 dB sounds squashed." },
  { key: "correlation", label: "Stereo correlation", unit: "", digits: 2, why: "+1 is mono; below 0, parts of the mix cancel on a phone speaker." },
];

function Measures({ before, after }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {MEASURES.map((m) => (
        <div key={m.key} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-white/80">{m.label}</span>
            <span className="font-mono text-sm">
              {after ? <><span className="text-white/45">{fmt(before[m.key], "", m.digits ?? 1)}</span> → <span className="text-mcz-cyan">{fmt(after[m.key], m.unit, m.digits ?? 1)}</span></>
                : <span className="text-white/85">{fmt(before[m.key], m.unit, m.digits ?? 1)}</span>}
            </span>
          </div>
          <p className="text-[11px] text-white/45">{m.why}</p>
        </div>
      ))}
    </div>
  );
}

// Tonal balance per third-octave, both normalised at 1 kHz so the lines show
// the SHAPE that changed rather than the overall level.
function BalanceChart({ chart }) {
  const pts = chart.filter((b) => b.before != null || b.after != null);
  if (pts.length < 3) return null;
  const vals = pts.flatMap((b) => [b.before, b.after]).filter((v) => v != null);
  const lo = Math.min(-18, ...vals), hi = Math.max(12, ...vals);
  const W = 560, H = 160, x = (i) => 20 + (i * (W - 40)) / (pts.length - 1), y = (v) => 10 + ((hi - v) * (H - 30)) / (hi - lo);
  const line = (k) => pts.map((b, i) => (b[k] == null ? null : `${x(i)},${y(b[k])}`)).filter(Boolean).join(" ");
  const ticks = [63, 250, 1000, 4000, 16000];
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tonal balance before and after, third-octave bands">
        <line x1="20" x2={W - 20} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,.15)" strokeDasharray="4 4" />
        <polyline points={line("before")} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" />
        <polyline points={line("after")} fill="none" stroke="#22d3ee" strokeWidth="2.5" />
        {pts.map((b, i) => ticks.includes(b.f) && (
          <text key={b.f} x={x(i)} y={H - 4} fontSize="10" textAnchor="middle" fill="rgba(255,255,255,.5)">
            {b.f >= 1000 ? `${b.f / 1000}k` : b.f}
          </text>
        ))}
      </svg>
      <figcaption className="text-[11px] text-white/45">
        <span className="text-white/70">Grey</span> is your mix, <span className="text-mcz-cyan">cyan</span> is the master — level per third-octave band, both set to 0 at 1 kHz.
      </figcaption>
    </figure>
  );
}

// Two buffers playing in lockstep, one heard at a time. Level-matched by
// default: the louder version is turned down to the quieter one's loudness,
// because louder always sounds better for the first few seconds and a
// comparison that rewards volume is not a comparison.
function useAB(original, master, sampleRate, lufsA, lufsB) {
  const ref = useRef({ ctx: null, srcs: [], gains: [], startAt: 0, offset: 0, bufs: null });
  const [playing, setPlaying] = useState(false);
  const [which, setWhich] = useState("master");
  const [matched, setMatched] = useState(true);
  const [pos, setPos] = useState(0);
  const total = original ? original[0].length / sampleRate : 0;

  const levels = () => {
    if (!matched || !Number.isFinite(lufsA) || !Number.isFinite(lufsB)) return [1, 1];
    const target = Math.min(lufsA, lufsB);
    return [dbToGain(target - lufsA), dbToGain(target - lufsB)];
  };
  const apply = (w = which) => {
    const s = ref.current;
    if (!s.ctx) return;
    const [ga, gb] = levels();
    const t = s.ctx.currentTime;
    s.gains[0]?.gain.setTargetAtTime(w === "original" ? ga : 0, t, 0.01);
    s.gains[1]?.gain.setTargetAtTime(w === "master" ? gb : 0, t, 0.01);
  };
  const stop = (keep = true) => {
    const s = ref.current;
    if (s.ctx && keep) s.offset = Math.min(total, s.offset + (s.ctx.currentTime - s.startAt));
    s.srcs.forEach((x) => { try { x.stop(); } catch { /* already stopped */ } });
    s.srcs = [];
    setPlaying(false);
  };
  const play = () => {
    const s = ref.current;
    if (!original || !master) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!s.ctx) s.ctx = new Ctx({ sampleRate });
    if (!s.bufs) s.bufs = [toAudioBuffer(s.ctx, original, sampleRate), toAudioBuffer(s.ctx, master, sampleRate)];
    if (s.offset >= total - 0.05) s.offset = 0;
    s.gains = s.bufs.map(() => { const g = s.ctx.createGain(); g.gain.value = 0; g.connect(s.ctx.destination); return g; });
    s.srcs = s.bufs.map((b, i) => { const src = s.ctx.createBufferSource(); src.buffer = b; src.connect(s.gains[i]); return src; });
    s.startAt = s.ctx.currentTime + 0.05;
    s.srcs.forEach((src) => src.start(s.startAt, s.offset));
    s.srcs[0].onended = () => { if (ref.current.srcs.length) { stop(false); ref.current.offset = 0; setPos(0); } };
    setPlaying(true);
    apply();
  };
  const seek = (frac) => {
    const was = playing;
    stop(false);
    ref.current.offset = Math.max(0, Math.min(total, frac * total));
    setPos(ref.current.offset);
    if (was) play();
  };
  useEffect(() => { apply(); }, [which, matched]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => {
      const s = ref.current;
      if (s.ctx) setPos(Math.min(total, s.offset + Math.max(0, s.ctx.currentTime - s.startAt)));
    }, 250);
    return () => clearInterval(t);
  }, [playing, total]);
  // New audio means new buffers; tearing down the context frees the memory.
  useEffect(() => () => {
    stop(false);
    ref.current.ctx?.close?.();
    ref.current = { ctx: null, srcs: [], gains: [], startAt: 0, offset: 0, bufs: null };
    setPos(0);
  }, [original, master]); // eslint-disable-line react-hooks/exhaustive-deps
  return { playing, which, setWhich, matched, setMatched, play, stop: () => stop(true), seek, pos, total };
}

function Choice({ options, value, onChange, label, locked = {} }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const lock = locked[o.key];
        if (lock && IN_SHELL) return null; // nothing to buy in a shell, so no locked door
        return (
          <button key={o.key} type="button" aria-pressed={value === o.key} disabled={!!lock}
            onClick={() => onChange(o.key)} title={lock ? `${lock} and up` : o.desc}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${value === o.key
              ? "border-mcz-cyan bg-mcz-cyan/15 text-white" : "border-white/15 text-white/70 hover:border-white/40"} ${lock ? "opacity-50" : ""}`}>
            {lock && <Lock size={11} className="mr-1 inline" />}{o.label}{lock && <span className="ml-1 text-[10px] text-white/50">{lock}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, suffix = "", note }) {
  const id = `mx-${label.replace(/\W+/g, "")}`;
  return (
    <label htmlFor={id} className="block text-sm text-white/70">
      <span className="flex justify-between"><span>{label}</span><span className="font-mono text-white/85">{value > 0 && suffix === " dB" ? "+" : ""}{value}{suffix}</span></span>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-cyan-400" />
      {note && <span className="text-[11px] text-white/40">{note}</span>}
    </label>
  );
}

export default function MixConnectZ() {
  const [s, setS] = useState(null);          // GET /mixz/ — ladder, storage, saved masters
  const [loadErr, setLoadErr] = useState("");
  const [song, setSong] = useState(null);    // { name, channels, sampleRate, seconds, resampled }
  const [before, setBefore] = useState(null);
  const [ref, setRef] = useState(null);      // reference: { name, analysis }
  const [settings, setSettings] = useState({ ...DEFAULTS, trims: { ...DEFAULTS.trims } });
  const [autoGlue, setAutoGlue] = useState(true);
  const [busy, setBusy] = useState("");      // stage text while working
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [bitDepth, setBitDepth] = useState(24);
  const [format, setFormat] = useState("wav");        // wav | mp3
  const [kbps, setKbps] = useState(MP3_DEFAULT_KBPS);
  const [rate, setRate] = useState(0);                // 0 = the file's own rate
  const [exportNote, setExportNote] = useState("");
  const [reuse, setReuse] = useState("");
  const [dither, setDither] = useState(true);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(null); // upload progress
  const [saved, setSaved] = useState("");
  const fileInput = useRef(null);
  const refInput = useRef(null);

  const load = () => api("/api/economy/mixz/").then((d) => { setS(d); setLoadErr(""); })
    .catch((e) => setLoadErr(e.message || "Your saved masters couldn't be loaded."));
  useEffect(() => { load(); }, []);

  // A track handed over from another app (a post's audio) arrives as a URL.
  useEffect(() => onHandoff("mixconnectz", async (p) => {
    if (!p?.url) return;
    try {
      setBusy("Fetching the track"); setErr("");
      const r = await fetch(p.url);
      if (!r.ok) throw new Error(`That track couldn't be fetched (${r.status}).`);
      await open(await r.arrayBuffer(), p.title || "Your track");
    } catch (e) { setErr(e.message); setBusy(""); }
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const allowed = s?.allowed;
  // Without the server's ladder this build offers only the default intensity:
  // it does not guess which others this member's tier includes.
  const allowedIntensities = allowed?.intensities || [DEFAULTS.intensity];
  const lockedIntensity = useMemo(() => {
    const out = {};
    for (const k of Object.keys(INTENSITY)) {
      if (allowedIntensities.includes(k)) continue;
      const row = (s?.ladder || []).find((t) => t.intensities.includes(k));
      out[k] = row ? row.label || TIER_NAME[row.tier] : "Not on your plan";
    }
    return out;
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const glueMax = Math.min(GLUE_DB_MAX, allowed?.glue_db_max ?? 0);
  const manualGlue = !!allowed?.manual_glue;
  const nextGlue = !manualGlue && (s?.ladder || []).find((t) => t.manual_glue);
  const heaviest = (s?.ladder || []).find((t) => t.intensities.includes("max"));

  const set = (k, v) => setSettings((cur) => ({ ...cur, [k]: v }));
  const setTrim = (k, v) => setSettings((cur) => ({ ...cur, trims: { ...cur.trims, [k]: v } }));

  async function open(fileOrBuf, name) {
    setErr(""); setResult(null); setSaved(""); setBefore(null); setRate(0); setExportNote("");
    setBusy("Reading the file"); setProgress(0.02);
    try {
      const d = await decodeFile(fileOrBuf);
      setSong({ name, ...d });
      setTitle(String(name || "Master").replace(/\.[a-z0-9]{2,4}$/i, "").slice(0, 120));
      setBusy("Measuring your mix");
      // Copies go to the worker; the page keeps its own for the A/B player.
      const a = await run("analyse", { channels: d.channels.map((c) => c.slice()), sampleRate: d.sampleRate });
      setBefore(a);
    } catch (e) {
      setSong(null);
      setErr(e.message);
    } finally { setBusy(""); }
  }

  async function openReference(file) {
    setErr("");
    try {
      setBusy("Measuring the reference");
      const d = await decodeFile(file);
      const a = await run("analyse", { channels: d.channels, sampleRate: d.sampleRate });
      setRef({ name: file.name, analysis: a });
      set("target", "reference");
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  }

  async function doMaster() {
    if (!song) return;
    setErr(""); setSaved(""); setProgress(0); setBusy("Starting");
    const intensity = allowedIntensities.includes(settings.intensity) ? settings.intensity : allowedIntensities[allowedIntensities.length - 1];
    const payload = {
      ...settings,
      intensity,
      glueDb: manualGlue && !autoGlue ? Math.min(glueMax, settings.glueDb ?? INTENSITY[intensity].glueGr) : null,
      target: settings.target === "reference" && !ref ? "streaming" : settings.target,
    };
    try {
      const out = await run("master", {
        channels: song.channels.map((c) => c.slice()),
        sampleRate: song.sampleRate,
        settings: payload,
        reference: ref ? { bands: ref.analysis.bands, lufs: ref.analysis.lufs } : null,
      }, { onProgress: (p, stage) => { setProgress(p); setBusy(stage); } });
      setResult({ ...out, settings: payload });
    } catch (e) { setErr(e.message); } finally { setBusy(""); setProgress(0); }
  }

  // The rate the export will be at: the file's own unless the member picked one.
  // An MP3 can only be 44.1 or 48 kHz, so a 96 kHz master goes out at 48.
  const outRate = song ? (rate || (format === "mp3" && ![32000, 44100, 48000].includes(song.sampleRate) ? 48000 : song.sampleRate)) : 0;
  const mime = format === "mp3" ? "audio/mpeg" : "audio/wav";
  async function encode() {
    setExportNote("");
    setBusy(outRate !== song.sampleRate ? `Converting to ${outRate / 1000} kHz` : format === "mp3" ? "Encoding MP3" : "Writing WAV");
    try {
      const out = await run("export", {
        channels: result.channels.map((c) => c.slice()),
        sampleRate: song.sampleRate,
        options: { format, bitDepth, dither: bitDepth === 16 && dither, kbps, rate: outRate },
      }, { onProgress: (p, stage) => { setProgress(p); setBusy(stage); } });
      if (out.trimDb < -0.01) setExportNote(`Converting the rate raised a peak a hair, so the file was trimmed ${r1(out.trimDb)} dB to stay under −1 dBTP.`);
      return out.bytes;
    } finally { setBusy(""); setProgress(0); }
  }
  const fileName = () => `${slug(title)}-master-${format === "mp3" ? `${kbps}k.mp3` : `${bitDepth}bit${outRate !== song?.sampleRate ? `-${outRate / 1000}k` : ""}.wav`}`;

  async function download() {
    setErr("");
    try { saveBlob(fileName(), new Blob([await encode()], { type: mime })); }
    catch (e) { setErr(e.message); }
  }

  const outSeconds = result ? result.channels[0].length / song.sampleRate : 0;
  const sizeMb = !result ? 0 : format === "mp3" ? mp3Mb(outSeconds, kbps)
    : (outSeconds * outRate * result.channels.length * (bitDepth / 8)) / (1024 * 1024);
  const tooBig = s?.storage && sizeMb > s.storage.upload_mb;
  const noRoom = s?.storage && sizeMb > s.storage.free_mb;

  async function save() {
    setErr(""); setSaved("");
    try {
      const bytes = await encode();
      const fd = new FormData();
      fd.append("file", new File([bytes], fileName(), { type: mime }));
      setSaving({ pct: 0 });
      const up = await api("/api/economy/uploads/", { method: "POST", body: fd, onProgress: (p) => setSaving(p) });
      const uploadId = up?.upload?.id;
      if (!uploadId) throw new Error("The file uploaded but no record came back, so it was not saved as a master.");
      const pick = (a) => ({
        lufs: a.lufs, lra: a.lra, truePeakDb: a.truePeakDb, samplePeakDb: a.samplePeakDb, plr: a.plr,
        correlation: a.correlation, lowCorrelation: a.lowCorrelation, sideToMidDb: a.sideToMidDb,
        seconds: a.seconds, sampleRate: a.sampleRate, channels: a.channels, clippedSamples: a.clippedSamples,
        bands: a.bands,
      });
      await api("/api/economy/mixz/", { method: "POST", body: {
        title, upload_id: uploadId,
        settings: { ...result.settings, bitDepth, dither: bitDepth === 16 && dither, reference: !!ref,
          format, kbps: format === "mp3" ? kbps : undefined, exportRate: outRate },
        before: pick(result.before), after: pick(result.after),
      } });
      setSaved(`Saved to Your masters — ${r1(sizeMb)} MB of your storage.`);
      load();
    } catch (e) {
      // The server's own sentence: over the per-file cap, out of storage, or
      // whatever else — never a "saved" that wasn't.
      setErr(e.message || "The master was not saved.");
    } finally { setSaving(null); }
  }

  // A revision: the settings a saved master was made with, back on the controls,
  // so the next master starts where that one finished rather than from scratch.
  function reviseFrom(m) {
    const st = m.settings || {};
    const next = cleanSettings({ ...DEFAULTS, ...st, trims: { ...DEFAULTS.trims, ...(st.trims || {}) } });
    if (next.target === "reference" && !ref) next.target = "streaming";
    setSettings(next);
    setAutoGlue(st.glueDb == null);
    if (st.format === "mp3" || st.format === "wav") setFormat(st.format);
    if (MP3_KBPS.includes(st.kbps)) setKbps(st.kbps);
    if ([16, 24].includes(st.bitDepth)) setBitDepth(st.bitDepth);
    setReuse(`"${m.title}"'s settings are on the controls${st.reference ? " (its Inspiration track isn't kept, so add it again to match it)" : ""}. ${song ? "Press Master it to make a new version." : "Pick a song to master with them."}`);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  async function remove(m) {
    const freed = m.size_mb ? ` and frees ${m.size_mb} MB` : "";
    if (!window.confirm(`Delete "${m.title}"? This deletes the mastered file${freed}. Your original is not touched.`)) return;
    try { await api(`/api/economy/mixz/${m.id}/`, { method: "DELETE" }); load(); }
    catch (e) { setErr(e.message); }
  }

  const ab = useAB(song?.channels, result?.channels, song?.sampleRate, result?.before?.lufs, result?.after?.lufs);
  // In the IntelligenceZ app the screens stay mounted when a member moves to
  // another one, so the A/B preview would keep playing underneath Chat. The shell
  // says when this screen is left; nothing else sends it.
  useEffect(() => {
    const leave = (e) => { if (e.detail === "mixconnectz") ab.stop(); };
    window.addEventListener("mcz-shell-leave", leave);
    return () => window.removeEventListener("mcz-shell-leave", leave);
  });
  const styleOpts = Object.entries(STYLES).map(([key, v]) => ({ key, label: v.label, desc: v.desc }));
  const targetOpts = [
    ...Object.entries(TARGETS).map(([key, v]) => ({ key, label: `${v.label} · ${v.lufs} LUFS`, desc: v.desc })),
    ...(ref ? [{ key: "reference", label: `Match reference · ${r1(ref.analysis.lufs)} LUFS`, desc: "Loudness and tonal balance from your reference track." }] : []),
    { key: "custom", label: settings.target === "custom" ? `Custom · ${settings.lufs} LUFS` : "Custom", desc: "Set the loudness yourself." },
  ];
  const intensityOpts = Object.entries(INTENSITY).map(([key, v]) => ({ key, label: v.label }));
  const targetDesc = settings.target === "reference" ? "Loudness and tonal balance matched to your reference."
    : settings.target === "custom" ? `${settings.lufs} LUFS, set by you.${settings.lufs > -14 ? " Streaming services play near −14 and will turn anything louder down to it." : ""}`
      : TARGETS[settings.target]?.desc;
  const it = INTENSITY[settings.intensity] || INTENSITY.medium;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="mixconnectz.png" alt="Mix ConnectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Mix ConnectZ</h2>
          <p className="text-sm text-white/60">Master a finished song — loudness, tone, width and peaks, measured and explained.</p>
        </div>
      </header>

      <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
        {s?.cost?.line || "Free — mastered on your device. Nothing is uploaded unless you save it."}
      </p>

      <div className="neon-frame space-y-4 p-4" data-tour="mixz-start">
        <div className="flex flex-wrap items-center gap-3">
          <button className="neon-btn-primary !w-auto px-5" disabled={!!busy} onClick={() => fileInput.current?.click()}>
            <Upload size={16} /> {song ? "Pick another song" : "Pick your song"}
          </button>
          <input ref={fileInput} type="file" accept="audio/*,video/*,.wav,.flac,.mp3,.m4a,.aac,.ogg" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) open(f, f.name); }} />
          <span className="text-[11px] text-white/45">WAV, FLAC, MP3, M4A or OGG, up to {MAX_SECONDS / 60} minutes. Master from your final mix, not from an earlier master.</span>
        </div>

        {song && (
          <p className="text-sm text-white/70">
            <span className="font-semibold text-white">{song.name}</span> · {mmss(song.seconds)} · {(song.sampleRate / 1000).toFixed(1)} kHz{song.channels.length === 1 ? " · mono (mastered as stereo)" : ""}
            {song.resampled && <span className="block text-[11px] text-mcz-gold">This file's sample rate couldn't be read from its header, so it was decoded at 44.1 kHz — the master will be 44.1 kHz.</span>}
          </p>
        )}

        {before && !result && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80">Your mix, measured</h3>
            <Measures before={before} />
            {before.clippedSamples > 0 && (
              <p className="text-xs text-mcz-gold">{before.clippedSamples.toLocaleString()} samples are already at full scale (clipped). A version from before the clipping will master cleaner.</p>
            )}
          </div>
        )}
      </div>

      {before && (
        <div className="neon-frame space-y-4 p-4" data-tour="mixz-settings">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80">Style</h3>
            <Choice label="Style" options={styleOpts} value={settings.style} onChange={(v) => set("style", v)} />
            <p className="text-[11px] text-white/45">{STYLES[settings.style].desc}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80">Loudness</h3>
            <Choice label="Loudness target" options={targetOpts} value={settings.target} onChange={(v) => set("target", v)} />
            {settings.target === "custom" && (
              <Slider label="Loudness" value={settings.lufs} min={CUSTOM_LUFS.min} max={CUSTOM_LUFS.max} step={0.5} suffix=" LUFS"
                onChange={(v) => set("lufs", v)} note="Quieter keeps more of the peaks; louder trades them away for level." />
            )}
            <p className="text-[11px] text-white/45">{targetDesc} True peaks are held under −1 dBTP.</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80">Intensity</h3>
            <Choice label="Intensity" options={intensityOpts} value={settings.intensity} onChange={(v) => set("intensity", v)} locked={lockedIntensity} />
            <p className="text-[11px] text-white/45">
              {it.label}: EQ moves up to ±{it.eqMax} dB, glue compression at {it.ratio}:1, and the limiter may take up to {it.maxLimitGr} dB off a peak before the master stops short of the target and says so.
            </p>
            {!IN_SHELL && heaviest && !allowedIntensities.includes("max") && (
              <p className="text-[11px] text-white/45">
                Heaviest — the hardest compression and the most limiting — comes with {heaviest.label || TIER_NAME[heaviest.tier]}.{" "}
                <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>See plans</button>
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 p-3" data-tour="mixz-dynamicz">
            <div>
              <h3 className="text-sm font-semibold text-white/80">DynamicZ</h3>
              <p className="text-[11px] text-white/45">How the hits and the loud moments behave: punch, then compression on one band or three.</p>
            </div>
            <Slider label="Punch" value={settings.punch} min={-PUNCH_MAX} max={PUNCH_MAX} step={5} suffix="%"
              onChange={(v) => set("punch", v)}
              note={settings.punch > 0 ? "Raises the first few milliseconds of each hit, so drums and plucks cut through. The ring after it is left alone."
                : settings.punch < 0 ? "Softens the first few milliseconds of each hit — rounder attacks, and less for the limiter to catch."
                  : "0 leaves the attacks as you mixed them."} />
            <label className="flex items-start gap-2 text-sm text-white/70">
              <input type="checkbox" className="mt-1" checked={settings.multiband} onChange={(e) => set("multiband", e.target.checked)} />
              <span>Multiband compression
                <span className="block text-[11px] text-white/45">
                  Lows (under {BANDS_SPLIT[0]} Hz), mids and highs (over {BANDS_SPLIT[1] / 1000} kHz) each get their own compressor, so a loud kick doesn't pull the vocal and cymbals down with it. Off compresses the whole mix as one.
                </span>
              </span>
            </label>
            <h4 className="text-xs font-semibold text-white/70">Compression</h4>
            {manualGlue ? (
              <>
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input type="checkbox" checked={autoGlue} onChange={(e) => setAutoGlue(e.target.checked)} />
                  Automatic — about {it.glueGr} dB on the loudest moments, and none if your mix is already dense
                </label>
                {!autoGlue && (
                  <Slider label="Compression amount" value={settings.glueDb ?? Math.min(glueMax, it.glueGr)} min={0} max={glueMax} step={0.5} suffix=" dB"
                    onChange={(v) => set("glueDb", v)}
                    note={`dB taken off the loudest moments, at ${it.ratio}:1. Your plan goes up to ${glueMax} dB.`} />
                )}
              </>
            ) : (
              <p className="text-[11px] text-white/45">
                Automatic — about {it.glueGr} dB off the loudest moments at {it.ratio}:1, and none if your mix is already dense.
                {!IN_SHELL && nextGlue && <> Setting the amount yourself comes with {nextGlue.label || TIER_NAME[nextGlue.tier]}. <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>See plans</button></>}
              </p>
            )}
          </div>

          <details className="space-y-3 rounded-lg border border-white/10 p-3">
            <summary className="cursor-pointer text-sm text-white/70">Fine-tune: EQ, width, mono bass, Inspiration</summary>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" checked={settings.eq} onChange={(e) => set("eq", e.target.checked)} />
              Corrective EQ — even out what sticks out of your mix's own balance
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Slider label="Low" value={settings.trims.low} min={-4} max={4} step={0.5} suffix=" dB" onChange={(v) => setTrim("low", v)} />
              <Slider label="Mid" value={settings.trims.mid} min={-4} max={4} step={0.5} suffix=" dB" onChange={(v) => setTrim("mid", v)} />
              <Slider label="High" value={settings.trims.high} min={-4} max={4} step={0.5} suffix=" dB" onChange={(v) => setTrim("high", v)} />
            </div>
            <Slider label="Width" value={settings.width ?? Math.round(STYLES[settings.style].side * 100)} min={50} max={150} step={5} suffix="%"
              onChange={(v) => set("width", v)} note="100% is your mix as it is. Widening is skipped if your mix already cancels in mono." />
            <div className="space-y-1">
              <span className="text-sm text-white/70">Mono bass (below 120 Hz)</span>
              <Choice label="Mono bass" value={settings.monoBass} onChange={(v) => set("monoBass", v)}
                options={[{ key: "auto", label: "Auto" }, { key: "on", label: "On" }, { key: "off", label: "Off" }]} />
              <p className="text-[11px] text-white/45">Auto folds the low end to the centre when it measures wide — stereo bass sums unevenly on mono systems.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="re-btn !w-auto px-3" disabled={!!busy} onClick={() => refInput.current?.click()}>
                {ref ? "Change Inspiration" : "✨ Inspiration: add a song to sound like"}
              </button>
              <input ref={refInput} type="file" accept="audio/*,.wav,.flac,.mp3,.m4a,.ogg" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) openReference(f); }} />
              {ref
                ? <span className="text-xs text-white/60">{ref.name} · {fmt(ref.analysis.lufs, " LUFS")} <button className="re-link" onClick={() => { setRef(null); if (settings.target === "reference") set("target", "streaming"); }}>Remove</button></span>
                : <span className="text-[11px] text-white/40">Inspiration: a finished song you want yours to sound like. Its tonal balance and loudness become the target. It never leaves your device.</span>}
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3">
            <button className="neon-btn-primary !w-auto px-5" disabled={!!busy} onClick={doMaster}>
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} {result ? "Master it again" : "Master it"}
            </button>
            <span className="text-[11px] text-emerald-300">Free — runs on your device</span>
          </div>
        </div>
      )}

      {busy && (
        <div className="space-y-1" role="status" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-mcz-cyan transition-all" style={{ width: `${Math.round(Math.max(0.03, progress) * 100)}%` }} />
          </div>
          <p className="text-xs text-white/60">{busy}…{progress > 0 && ` ${Math.round(progress * 100)}%`}</p>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
      {reuse && <p className="text-sm text-emerald-300">{reuse}</p>}

      {result && (
        <div className="mcz-reveal neon-frame space-y-4 p-4" data-tour="mixz-result">
          <div className="flex flex-wrap items-center gap-3">
            {ab.playing
              ? <button className="re-btn !w-auto px-4" onClick={ab.stop}><Pause size={14} /> Pause</button>
              : <button className="re-btn !w-auto px-4" onClick={ab.play}><Play size={14} /> Play</button>}
            <div role="group" aria-label="Which version to hear" className="flex overflow-hidden rounded-full border border-white/20">
              {["original", "master"].map((w) => (
                <button key={w} aria-pressed={ab.which === w} onClick={() => ab.setWhich(w)}
                  className={`px-4 py-1.5 text-sm ${ab.which === w ? "bg-mcz-cyan/20 text-white" : "text-white/60"}`}>
                  {w === "original" ? "Your mix" : "Master"}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input type="checkbox" checked={ab.matched} onChange={(e) => ab.setMatched(e.target.checked)} /> Level-matched
            </label>
            <span className="font-mono text-xs text-white/50">{mmss(ab.pos)} / {mmss(ab.total)}</span>
          </div>
          <input type="range" aria-label="Position" min={0} max={1000} value={ab.total ? Math.round((ab.pos / ab.total) * 1000) : 0}
            onChange={(e) => ab.seek(Number(e.target.value) / 1000)} className="w-full accent-cyan-400" />
          <p className="text-[11px] text-white/45">
            {ab.matched
              ? "Both versions play at the same loudness, so you hear what changed rather than which is louder. Untick to hear the real levels."
              : "Real levels: the master is louder, and louder always sounds better for the first few seconds."}
          </p>

          {result.outcome.map((o) => <p key={o} className="rounded-lg bg-mcz-gold/10 px-3 py-2 text-xs text-mcz-gold">{o}</p>)}
          {result.plan.warnings.map((w) => <p key={w} className="text-xs text-mcz-gold">{w}</p>)}

          <Measures before={result.before} after={result.after} />
          <BalanceChart chart={result.chart} />

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white/80">What the master did, and why</h3>
            <ul className="space-y-1 text-xs text-white/70">
              {result.plan.eq.map((m) => <li key={`${m.type}${m.f}${m.why}`}>• {m.why}</li>)}
              <li>• {result.plan.width.why}</li>
              {result.plan.width.monoWhy && <li>• {result.plan.width.monoWhy}</li>}
              <li>• {result.plan.punchWhy}{result.report.punch ? ` It moved the attacks by up to ${fmt(result.report.punch.maxDb, " dB")}.` : ""}</li>
              <li>• {result.plan.glueWhy}{result.report.glue?.bands ? ` Took off at most: ${result.report.glue.bands.map((b) => `${b.band} ${fmt(b.maxGrDb, " dB")}`).join(", ")}.` : ""}</li>
              <li>• {result.plan.loudness.why} The limiter took up to {fmt(result.report.limiterMaxGrDb, " dB")} off the highest peaks.</li>
            </ul>
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 p-3">
            <h3 className="text-sm font-semibold text-white/80">Export</h3>
            <Choice label="Format" value={format} onChange={setFormat}
              options={[{ key: "wav", label: "WAV" }, { key: "mp3", label: "MP3" }]} />
            {format === "mp3" && (
              <div className="space-y-1">
                <Choice label="MP3 bitrate" value={String(kbps)} onChange={(v) => setKbps(Number(v))}
                  options={MP3_KBPS.map((k) => ({ key: String(k), label: `${k} kbps` }))} />
                <p className="text-[11px] text-white/45">
                  MP3 is for sharing and previews: it throws detail away to be small. Distributors want the WAV.{" "}
                  <a className="re-link" href="/licenses/lamejs.txt" target="_blank" rel="noreferrer">Encoder: LAME (LGPL)</a>.
                  {kbps < 192 && " Under 192 kbps the encoder's rebuilt peaks can poke past −1 dBTP, and the highs get swirly."}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Choice label="Sample rate" value={String(rate)} onChange={(v) => setRate(Number(v))}
                options={[{ key: "0", label: `As mixed · ${song ? (song.sampleRate / 1000).toFixed(1) : ""} kHz` },
                  ...Object.keys(EXPORT_RATES).filter((r) => Number(r) !== song?.sampleRate).map((r) => ({ key: r, label: `${Number(r) / 1000} kHz` }))]} />
              <p className="text-[11px] text-white/45">
                {rate ? `${EXPORT_RATES[rate]} Converting takes a few seconds on your device, and the peaks are checked again after it.`
                  : outRate !== song?.sampleRate ? `MP3 can't be ${(song.sampleRate / 1000).toFixed(1)} kHz, so this goes out at ${outRate / 1000} kHz.`
                    : "Your master stays at the rate your mix was made at — nothing is converted."}
              </p>
            </div>
            {format === "wav" && <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
              <Choice label="Bit depth" value={String(bitDepth)} onChange={(v) => setBitDepth(Number(v))}
                options={[{ key: "24", label: "24-bit WAV" }, { key: "16", label: "16-bit WAV" }]} />
              {bitDepth === 16 && (
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={dither} onChange={(e) => setDither(e.target.checked)} /> TPDF dither
                </label>
              )}
            </div>}
            {format === "wav" && <p className="text-[11px] text-white/45">
              {bitDepth === 24
                ? "24-bit is what distributors ask for. Its rounding sits around −144 dB, below any playback system, so no dither is added."
                : dither
                  ? "16-bit rounds every sample to one of 65,536 steps; dither turns the gritty distortion that causes on fades into a steady hiss about 96 dB down. Leave it on unless you know why not."
                  : "Dither off: quiet fades and reverb tails may pick up a gritty edge from the rounding."}
            </p>}
            <input className="neon-input w-full" maxLength={120} aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex flex-wrap items-center gap-3">
              <button className="re-btn !w-auto px-4" onClick={download}><Download size={14} /> Download {format === "mp3" ? "MP3" : "WAV"} · {r1(sizeMb)} MB</button>
              {s?.storage && (
                <button className="re-btn !w-auto px-4" disabled={!!saving || tooBig || noRoom} onClick={save}>
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save to Your masters
                </button>
              )}
            </div>
            {s?.storage && (
              <p className="text-[11px] text-white/45">
                {tooBig
                  ? `This file is ${r1(sizeMb)} MB and your plan takes files up to ${s.storage.upload_mb} MB — try 16-bit or MP3, or download it instead.`
                  : noRoom
                    ? `Saving needs ${r1(sizeMb)} MB and you have ${s.storage.free_mb} MB free. Delete a saved master below, or download this one.`
                    : `Saving uses ${r1(sizeMb)} MB of your ${s.storage.free_mb} MB free. Downloading uses none.`}
              </p>
            )}
            {saving && <p className="text-xs text-white/60">Uploading… {saving.pct != null ? `${Math.round(saving.pct)}%` : ""}{saving.etaSeconds ? ` · about ${Math.ceil(saving.etaSeconds)}s left` : ""}</p>}
            {exportNote && <p className="text-xs text-mcz-gold">{exportNote}</p>}
            {saved && <p className="text-xs text-emerald-300">{saved}</p>}
          </div>
        </div>
      )}

      <div className="space-y-2" data-tour="mixz-recent">
        <h3 className="text-sm font-semibold text-white/70">Your masters</h3>
        {loadErr && <p role="alert" className="text-xs text-mcz-ember">{loadErr}</p>}
        {s && !s.masters?.length && <p className="text-xs text-white/45">Nothing saved yet. Masters you save land here, with the numbers they were made with.</p>}
        {s?.masters?.map((m) => (
          <div key={m.id} className="space-y-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-white/85">{m.title}</span>
              <span className="text-[11px] text-white/45">
                {fmt(m.after?.lufs, " LUFS")} · {fmt(m.after?.truePeakDb, " dBTP")}{m.size_mb ? ` · ${m.size_mb} MB` : ""}
              </span>
            </div>
            {m.missing
              ? <p className="text-xs text-mcz-gold">This file isn't on the server any more. The record stays so you know it existed.</p>
              : m.url && <audio controls preload="none" src={m.url} className="w-full" />}
            <div className="flex flex-wrap gap-3 text-xs">
              {m.url && !m.missing && <a className="re-link" href={m.url} download>Download</a>}
              {m.settings && Object.keys(m.settings).length > 0 && (
                <button className="re-link" onClick={() => reviseFrom(m)}>Revise — use these settings</button>
              )}
              <button className="inline-flex items-center gap-1 text-white/50 hover:text-mcz-ember" onClick={() => remove(m)}><Trash2 size={12} /> Delete</button>
            </div>
            {m.url && !m.missing && <Doors item={{ title: m.title, url: m.url, kind: "audio", text: `Mastered: ${fmt(m.after?.lufs, " LUFS")}` }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
