// Mix ConnectZ's AI and genre presets — the eMastered headline, on the controls below it.
// Genre presets are free and set the controls at once. "Let the AI listen" sends ~90 seconds from the middle of
// the song (an MP3 made on the device) to /api/economy/mixz/ai/, which picks the genre and adjusts its preset,
// each move with its reason; the price is on the button before it is pressed and a failed listen is not charged.
// Everything here decides nothing: the presets, the moves, their ranges and the wording are the server's, and
// nothing is mastered until Master it.
import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { api } from "../api.js";
import { run } from "../mastering/client.js";
import { PROMPTZ, ENERGY } from "../resources.js";

const MOVE_LABEL = { style: "Style", intensity: "Intensity", target: "Loudness", punch: "Punch", multiband: "Multiband",
  width: "Width", "trims.low": "Lows", "trims.mid": "Mids", "trims.high": "Highs", vocal: "Vocal lift" };
const shown = (k, v) => (typeof v === "boolean" ? (v ? "on" : "off")
  : typeof v === "number" ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}${k === "width" ? "%" : k === "punch" ? "%" : " dB"}` : v);

export default function MixAI({ song, settings, onApply, allowedIntensities = [], intensityLabel = (k) => k }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [got, setGot] = useState(null);
  const [preset, setPreset] = useState("");
  useEffect(() => { api("/api/economy/mixz/ai/").then(setD).catch(() => setD(null)); }, []);
  if (!d) return null;

  const apply = (st, label) => {
    onApply({ ...settings, ...st, trims: { ...settings.trims, ...(st.trims || {}) } });
    setPreset(label);
  };
  const capped = (st) => st.intensity && allowedIntensities.length && !allowedIntensities.includes(st.intensity)
    ? `${intensityLabel(st.intensity)} intensity isn't on your plan, so the master uses ${intensityLabel(allowedIntensities[allowedIntensities.length - 1])}.` : "";

  async function listen() {
    setErr(""); setGot(null);
    try {
      setBusy("Making a 90-second clip on your device");
      const fs = song.sampleRate, n = song.channels[0].length, len = Math.min(n, Math.round((d.clip_seconds || 90) * fs));
      const start = Math.max(0, Math.floor((n - len) / 2));                        // the middle: a chorus is likelier there than in an intro
      const ch = song.channels.map((c) => c.slice(start, start + len));
      const mp3 = await run("export", { channels: ch, sampleRate: fs, options: { format: "mp3", kbps: 128, rate: [32000, 44100, 48000].includes(fs) ? fs : 44100 } });
      setBusy("The AI is listening");
      const fd = new FormData();
      fd.append("clip", new File([mp3.bytes], "clip.mp3", { type: "audio/mpeg" }));
      const r = await api("/api/economy/mixz/ai/", { method: "POST", body: fd });
      apply(r.settings, `AI: ${r.genre_label}`);
      setGot(r);
    } catch (e) { setErr(e.message || "The AI couldn't hear that. Nothing was charged."); } finally { setBusy(""); }
  }

  const p = d.price || {};
  return (
    <div className="space-y-2 rounded-lg border border-mcz-cyan/30 p-3" data-tour="mixz-ai">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1 text-sm font-semibold text-white/85"><Sparkles size={14} /> AI mastering</h3>
        <button className="neon-btn-primary !w-auto px-4" disabled={!!busy || !d.configured || !p.can_run || !song} onClick={listen}>
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Let the AI listen and set it
        </button>
        <span className="text-[11px]">
          {p.free_today ? <span className="text-emerald-300">free today (a daily prompt)</span>
            : <span className="text-mcz-ember">−{p.cost_cents} {PROMPTZ}</span>}
          {p.energy ? <span className="text-mcz-ember"> −{p.energy} {ENERGY}</span> : null}
          <span className="text-white/60"> · not charged if it can't hear it</span>
        </span>
      </div>
      {!d.configured && <p className="text-[11px] text-mcz-gold">The AI isn't switched on here yet; the genre presets below still work.</p>}
      <p className="text-[11px] text-white/60">{d.note}</p>
      {busy && <p className="text-[11px] text-white/60">{busy}…</p>}
      {err && <p role="alert" className="text-[11px] text-mcz-ember">{err}</p>}
      {got && (
        <div className="space-y-1 rounded-md bg-white/5 p-2 text-[11px]">
          <p className="text-emerald-300">Sounds like {got.genre_label}. {got.heard}</p>
          <p className="text-white/60">Started from the {got.genre_label} preset: {got.genre_why}</p>
          {got.moves.length ? got.moves.map((m) => (
            <p key={m.key} className="text-white/75">• <b className="text-white">{MOVE_LABEL[m.key] || m.key} {shown(m.key, m.value)}</b> — {m.why}</p>
          )) : <p className="text-white/60">Nothing to change on top of the preset.</p>}
          {capped(got.settings) && <p className="text-mcz-gold">{capped(got.settings)}</p>}
          <p className="text-white/60">It's on the controls below — move anything, then press Master it.{got.charged_cents === 0 ? " A daily prompt covered it." : ""}</p>
        </div>
      )}
      <div className="space-y-1">
        {[...new Set(d.genres.map((g) => g.group || "Genre"))].map((grp) => (
          <div key={grp} className="space-y-1">
            <p className="text-[11px] text-white/55">{grp === "Genre" ? "Or start from a genre" : grp === "Rap style" ? "By rap style" : "By singing range"} — <span className="text-emerald-300">free</span>:</p>
            <div className="flex flex-wrap gap-1.5">
              {d.genres.filter((g) => (g.group || "Genre") === grp).map((g) => (
                <button key={g.key} title={g.why} className={`pill text-[11px] ${preset === g.label ? "!bg-white/20" : ""}`}
                  onClick={() => { apply(g.settings, g.label); setGot(null); }}>{g.emoji} {g.label.replace(/ master$/, "")}</button>
              ))}
            </div>
          </div>
        ))}
        {preset && !preset.startsWith("AI") && (() => { const g = d.genres.find((x) => x.label === preset); return g ? (
          <p className="text-[11px] text-white/60">{g.label} is on the controls: {g.why}{capped(g.settings) ? ` ${capped(g.settings)}` : ""}</p>) : null; })()}
      </div>
    </div>
  );
}
